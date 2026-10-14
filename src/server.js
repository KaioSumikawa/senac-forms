require("dotenv").config();

const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const Store = session.Store;
const helmet = require("helmet");
const db = require("./database");
const { courses, questionsByCourse } = require("./questions");

const app = express();
const port = Number(process.env.PORT) || 3000;
const adminUsername = process.env.ADMIN_USERNAME;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const sessionSecret = process.env.SESSION_SECRET;

if (!adminUsername || !adminPasswordHash || !sessionSecret || sessionSecret.length < 32) {
  console.error("Configure ADMIN_USERNAME, ADMIN_PASSWORD_HASH e SESSION_SECRET (mínimo de 32 caracteres) no arquivo .env.");
  process.exit(1);
}
if (!/^\$2[aby]\$/.test(adminPasswordHash)) {
  console.error("ADMIN_PASSWORD_HASH precisa ser um hash bcrypt. Gere-o com npm run hash-password.");
  process.exit(1);
}

class SQLiteSessionStore extends Store {
  constructor(database) {
    super();
    this.database = database;
    this.getStatement = database.prepare("SELECT sess, expire FROM admin_sessions WHERE sid = ?");
    this.setStatement = database.prepare(`
      INSERT INTO admin_sessions (sid, sess, expire) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
    `);
    this.destroyStatement = database.prepare("DELETE FROM admin_sessions WHERE sid = ?");
    this.touchStatement = database.prepare("UPDATE admin_sessions SET expire = ? WHERE sid = ?");
    this.cleanupStatement = database.prepare("DELETE FROM admin_sessions WHERE expire <= ?");
    this.cleanupStatement.run(Date.now());
  }
  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);
      if (!row || row.expire <= Date.now()) {
        this.destroyStatement.run(sid);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.sess));
    } catch (error) { callback(error); }
  }
  set(sid, sess, callback) {
    try {
      const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
      this.setStatement.run(sid, JSON.stringify(sess), expire);
      callback(null);
    } catch (error) { callback(error); }
  }
  destroy(sid, callback) {
    try { this.destroyStatement.run(sid); callback(null); } catch (error) { callback(error); }
  }
  touch(sid, sess, callback) {
    try {
      const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
      this.touchStatement.run(expire, sid);
      callback(null);
    } catch (error) { callback(error); }
  }
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));
app.use(session({
  name: "senac.admin.sid",
  secret: sessionSecret,
  store: new SQLiteSessionStore(db),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const publicDirectory = path.join(__dirname, "..", "public");
app.get("/js/questions.js", (req, res) => res.sendFile(path.join(__dirname, "questions.js")));
app.use(express.static(publicDirectory, { index: false }));

const responseLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  if (req.path === "/admin") return res.redirect("/admin/login");
  return res.status(401).json({ error: "Autenticação necessária." });
}

function validPeriod(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getFilters(req, res) {
  const { course, from, to } = req.query;
  if (course && !courses.some((item) => item.id === course)) {
    res.status(400).json({ error: "Filtro de curso inválido." });
    return null;
  }
  if (!validPeriod(from) || !validPeriod(to) || (from && to && from > to)) {
    res.status(400).json({ error: "Período inválido." });
    return null;
  }
  const conditions = [];
  const params = [];
  if (course) { conditions.push("course_id = ?"); params.push(course); }
  if (from) { conditions.push("submitted_at >= ?"); params.push(`${from}T00:00:00.000Z`); }
  if (to) {
    const nextDay = new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000).toISOString();
    conditions.push("submitted_at < ?");
    params.push(nextDay);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

function normalizeSubmission(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Dados inválidos." };
  const { courseId, otherCourseName, answers } = body;
  const course = courses.find((item) => item.id === courseId);
  if (!course) return { error: "Selecione um curso técnico válido." };
  if (courseId === "outros") {
    if (typeof otherCourseName !== "string" || !otherCourseName.trim() || otherCourseName.trim().length > 100) {
      return { error: "Informe o nome do curso técnico (até 100 caracteres)." };
    }
  } else if (otherCourseName) {
    return { error: "Nome de curso adicional não esperado." };
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return { error: "Respostas inválidas." };

  const questions = questionsByCourse[courseId];
  const questionIds = new Set(questions.map((question) => question.id));
  if (Object.keys(answers).some((key) => !questionIds.has(key))) return { error: "Há respostas que não correspondem a este curso." };
  const cleaned = {};
  for (const question of questions) {
    let answer = answers[question.id];
    if (question.type === "textarea") {
      if (answer === undefined || answer === null || answer === "") {
        if (question.required) return { error: "Preencha os campos obrigatórios." };
        continue;
      }
      if (typeof answer !== "string" || answer.length > 2000) return { error: "Uma das respostas abertas excede 2.000 caracteres." };
      answer = answer.trim();
      if (question.required && !answer) return { error: "Preencha os campos obrigatórios." };
      if (answer) cleaned[question.id] = answer;
    } else if (question.type === "checkbox") {
      if (answer === undefined) answer = [];
      if (!Array.isArray(answer) || answer.length > question.options.length ||
          answer.some((item) => typeof item !== "string" || !question.options.includes(item)) ||
          new Set(answer).size !== answer.length) return { error: "Uma das respostas de múltipla seleção é inválida." };
      if (question.required && answer.length === 0) return { error: "Preencha os campos obrigatórios." };
      if (answer.length) cleaned[question.id] = answer;
    } else {
      if (typeof answer !== "string" || !question.options.includes(answer)) return { error: "Selecione uma opção válida em cada pergunta obrigatória." };
      cleaned[question.id] = answer;
    }
  }
  return { course, courseName: courseId === "outros" ? otherCourseName.trim() : course.name, answers: cleaned };
}

app.get("/", (req, res) => res.sendFile(path.join(publicDirectory, "index.html")));
app.get("/admin/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.sendFile(path.join(publicDirectory, "admin-login.html"));
});
app.get("/admin", requireAdmin, (req, res) => res.sendFile(path.join(publicDirectory, "admin.html")));

app.post("/api/responses", responseLimiter, (req, res) => {
  const submission = normalizeSubmission(req.body);
  if (submission.error) return res.status(400).json({ error: submission.error });
  try {
    const result = db.prepare("INSERT INTO responses (course_id, course_name, answers_json) VALUES (?, ?, ?)")
      .run(submission.course.id, submission.courseName, JSON.stringify(submission.answers));
    res.status(201).json({ message: "Resposta registrada. Obrigado por participar!", id: result.lastInsertRowid });
  } catch (error) {
    console.error("Falha ao salvar uma resposta.");
    res.status(500).json({ error: "Não foi possível salvar sua resposta. Tente novamente mais tarde." });
  }
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" ||
      username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: "Informe usuário e senha." });
  }
  try {
    const valid = username === adminUsername && await bcrypt.compare(password, adminPasswordHash);
    if (!valid) return res.status(401).json({ error: "Usuário ou senha incorretos." });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: "Não foi possível iniciar a sessão." });
      req.session.isAdmin = true;
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ error: "Não foi possível iniciar a sessão." });
        res.json({ message: "Autenticado." });
      });
    });
  } catch (error) {
    console.error("Falha na autenticação administrativa.");
    res.status(500).json({ error: "Não foi possível autenticar neste momento." });
  }
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "Não foi possível encerrar a sessão." });
    res.clearCookie("senac.admin.sid", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Sessão encerrada." });
  });
});

app.get("/api/admin/summary", requireAdmin, (req, res) => {
  const filters = getFilters(req, res);
  if (!filters) return;
  try {
    const total = db.prepare(`SELECT COUNT(*) AS total FROM responses ${filters.where}`).get(...filters.params).total;
    const coursesSummary = db.prepare(`
      SELECT course_id AS courseId, course_name AS courseName, COUNT(*) AS total
      FROM responses ${filters.where} GROUP BY course_id, course_name ORDER BY total DESC
    `).all(...filters.params);
    const rows = db.prepare(`SELECT course_id, answers_json FROM responses ${filters.where}`).all(...filters.params);
    const aggregates = {};
    for (const course of courses) aggregates[course.id] = {};
    for (const row of rows) {
      const answers = JSON.parse(row.answers_json);
      for (const [questionId, answer] of Object.entries(answers)) {
        if (Array.isArray(answer)) continue;
        const question = questionsByCourse[row.course_id].find((item) => item.id === questionId);
        if (!question || question.type === "textarea") continue;
        const bucket = aggregates[row.course_id][questionId] || (aggregates[row.course_id][questionId] = { label: question.label, choices: {} });
        bucket.choices[answer] = (bucket.choices[answer] || 0) + 1;
      }
    }
    res.json({ total, courses: coursesSummary, charts: aggregates });
  } catch (error) {
    console.error("Falha ao consultar o resumo administrativo.");
    res.status(500).json({ error: "Não foi possível carregar o resumo." });
  }
});

app.get("/api/admin/responses", requireAdmin, (req, res) => {
  const filters = getFilters(req, res);
  if (!filters) return;
  const page = Number(req.query.page) || 1;
  if (!Number.isInteger(page) || page < 1 || page > 100000) return res.status(400).json({ error: "Página inválida." });
  const limit = 20;
  try {
    const total = db.prepare(`SELECT COUNT(*) AS total FROM responses ${filters.where}`).get(...filters.params).total;
    const records = db.prepare(`
      SELECT id, course_id AS courseId, course_name AS courseName, submitted_at AS submittedAt
      FROM responses ${filters.where} ORDER BY submitted_at DESC, id DESC LIMIT ? OFFSET ?
    `).all(...filters.params, limit, (page - 1) * limit);
    res.json({ responses: records, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error("Falha ao consultar respostas.");
    res.status(500).json({ error: "Não foi possível carregar as respostas." });
  }
});

app.get("/api/admin/responses/:id", requireAdmin, (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "Identificador inválido." });
  try {
    const record = db.prepare(`
      SELECT id, course_id AS courseId, course_name AS courseName, answers_json AS answersJson, submitted_at AS submittedAt
      FROM responses WHERE id = ?
    `).get(Number(req.params.id));
    if (!record) return res.status(404).json({ error: "Resposta não encontrada." });
    res.json({
      id: record.id,
      courseId: record.courseId,
      courseName: record.courseName,
      answers: JSON.parse(record.answersJson),
      submittedAt: record.submittedAt
    });
  } catch (error) {
    console.error("Falha ao consultar uma resposta.");
    res.status(500).json({ error: "Não foi possível carregar esta resposta." });
  }
});

app.get("/api/admin/export.csv", requireAdmin, (req, res) => {
  const filters = getFilters(req, res);
  if (!filters) return;
  try {
    const rows = db.prepare(`
      SELECT id, course_name AS courseName, answers_json AS answersJson, submitted_at AS submittedAt
      FROM responses ${filters.where} ORDER BY submitted_at DESC, id DESC LIMIT 10000
    `).all(...filters.params);
    const escapeCsv = (value) => {
      let textValue = String(value ?? "");
      if (/^[\s]*[=+\-@]/.test(textValue)) textValue = `'${textValue}`;
      return `"${textValue.replace(/"/g, '""')}"`;
    };
    const headings = ["ID", "Curso", "Enviado em"];
    const allQuestions = [...new Map(Object.values(questionsByCourse).flat().map((question) => [question.id, question])).values()];
    headings.push(...allQuestions.map((question) => question.label));
    const csvRows = [headings.map(escapeCsv).join(";")];
    for (const row of rows) {
      const answers = JSON.parse(row.answersJson);
      csvRows.push([row.id, row.courseName, row.submittedAt, ...allQuestions.map((question) => answers[question.id])].map((value) =>
        escapeCsv(Array.isArray(value) ? value.join(", ") : value)
      ).join(";"));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="respostas-pesquisa-senac.csv"');
    res.send(`\uFEFF${csvRows.join("\r\n")}`);
  } catch (error) {
    console.error("Falha ao exportar respostas.");
    res.status(500).json({ error: "Não foi possível exportar as respostas." });
  }
});

app.use((error, req, res, next) => {
  if (error && error.type === "entity.too.large") return res.status(413).json({ error: "O envio excede o tamanho permitido." });
  console.error("Erro inesperado ao processar uma solicitação.");
  res.status(500).json({ error: "Ocorreu um erro inesperado." });
});

app.listen(port, () => console.log(`Pesquisa disponível em http://localhost:${port}`));
