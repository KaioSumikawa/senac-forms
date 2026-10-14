(() => {
  const { courses, questionsByCourse } = window.SurveyQuestions;
  const filterCourse = document.querySelector("#filter-course");
  const responseDialog = document.querySelector("#response-dialog");
  const charts = [];
  let currentPage = 1;
  let pages = 1;
  let courseChart;

  for (const course of courses) {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    filterCourse.append(option);
  }

  function filterQuery() {
    const params = new URLSearchParams();
    if (filterCourse.value) params.set("course", filterCourse.value);
    if (document.querySelector("#filter-from").value) params.set("from", document.querySelector("#filter-from").value);
    if (document.querySelector("#filter-to").value) params.set("to", document.querySelector("#filter-to").value);
    return params;
  }
  async function api(url) {
    const response = await fetch(url);
    if (response.status === 401) {
      window.location.assign("/admin/login");
      throw new Error("Sessão expirada.");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os dados.");
    return result;
  }
  function showError(message) {
    const element = document.querySelector("#dashboard-error");
    element.textContent = message;
    element.hidden = false;
  }
  function localDate(value) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
  function renderCourses(summary) {
    const labels = summary.courses.map((item) => item.courseName);
    const values = summary.courses.map((item) => item.total);
    if (courseChart) courseChart.destroy();
    courseChart = new Chart(document.querySelector("#course-chart"), {
      type: "bar",
      data: { labels, datasets: [{ label: "Respostas", data: values, backgroundColor: "#1f77a5", borderRadius: 6, maxBarThickness: 42 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
      }
    });
  }
  function renderAnswerCharts(aggregates, filter) {
    charts.forEach((chart) => chart.destroy());
    charts.length = 0;
    const container = document.querySelector("#answer-charts");
    container.replaceChildren();
    const groups = filter ? { [filter]: aggregates[filter] || {} } : aggregates;
    let count = 0;
    for (const [courseId, questions] of Object.entries(groups)) {
      const course = courses.find((item) => item.id === courseId);
      for (const [questionId, item] of Object.entries(questions || {})) {
        const values = Object.entries(item.choices || {});
        if (!values.length) continue;
        count++;
        const card = document.createElement("article");
        card.className = "answer-chart-card";
        const title = document.createElement("h3");
        title.textContent = item.label;
        const subtitle = document.createElement("p");
        subtitle.className = "muted chart-course";
        subtitle.textContent = course ? course.name : "";
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-label", `Respostas para ${item.label}`);
        card.append(title, subtitle, canvas);
        container.append(card);
        charts.push(new Chart(canvas, {
          type: "bar",
          data: { labels: values.map(([label]) => label), datasets: [{ data: values.map(([, value]) => value), backgroundColor: ["#1f77a5", "#32a5a1", "#e6a447", "#7185b7", "#91b6a4", "#bd7790"], borderRadius: 5 }] },
          options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } }
        }));
      }
    }
    document.querySelector("#empty-charts").hidden = count > 0;
  }
  async function loadSummary() {
    const summary = await api(`/api/admin/summary?${filterQuery()}`);
    document.querySelector("#total-responses").textContent = summary.total.toLocaleString("pt-BR");
    document.querySelector("#active-courses").textContent = summary.courses.length.toLocaleString("pt-BR");
    renderCourses(summary);
    renderAnswerCharts(summary.charts, filterCourse.value);
  }
  async function loadResponses() {
    const query = filterQuery();
    query.set("page", String(currentPage));
    const result = await api(`/api/admin/responses?${query}`);
    pages = result.pages;
    const body = document.querySelector("#responses-body");
    body.replaceChildren();
    for (const record of result.responses) {
      const row = document.createElement("tr");
      const id = document.createElement("td"); id.textContent = `#${record.id}`;
      const course = document.createElement("td"); course.textContent = record.courseName;
      const date = document.createElement("td"); date.textContent = localDate(record.submittedAt);
      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.className = "text-button details-button";
      button.type = "button";
      button.textContent = "Ver respostas";
      button.addEventListener("click", () => showResponse(record.id));
      actionCell.append(button);
      row.append(id, course, date, actionCell);
      body.append(row);
    }
    document.querySelector("#empty-responses").hidden = result.responses.length > 0;
    document.querySelector("#list-count").textContent = `${result.total.toLocaleString("pt-BR")} registros`;
    document.querySelector("#page-label").textContent = `Página ${result.page} de ${result.pages}`;
    document.querySelector("#previous-page").disabled = result.page <= 1;
    document.querySelector("#next-page").disabled = result.page >= result.pages;
  }
  async function showResponse(id) {
    try {
      const record = await api(`/api/admin/responses/${id}`);
      document.querySelector("#dialog-title").textContent = `${record.courseName} · #${record.id}`;
      document.querySelector("#dialog-date").textContent = localDate(record.submittedAt);
      const container = document.querySelector("#dialog-answers");
      container.replaceChildren();
      const questions = questionsByCourse[record.courseId] || [];
      for (const question of questions) {
        const answer = record.answers[question.id];
        const item = document.createElement("section");
        item.className = "dialog-answer";
        const label = document.createElement("h3"); label.textContent = question.label;
        const value = document.createElement("p");
        value.textContent = Array.isArray(answer) ? answer.join(", ") : answer || "Sem resposta";
        item.append(label, value);
        container.append(item);
      }
      if (record.courseId === "outros") {
        const name = document.createElement("p");
        name.className = "muted";
        name.textContent = "Nome informado para o curso: " + record.courseName;
        container.prepend(name);
      }
      responseDialog.showModal();
    } catch (error) { showError(error.message); }
  }
  async function refresh() {
    document.querySelector("#dashboard-error").hidden = true;
    currentPage = 1;
    try { await Promise.all([loadSummary(), loadResponses()]); }
    catch (error) { showError(error.message); }
  }
  document.querySelector("#apply-filters").addEventListener("click", refresh);
  document.querySelector("#previous-page").addEventListener("click", async () => {
    if (currentPage > 1) { currentPage--; try { await loadResponses(); } catch (error) { showError(error.message); } }
  });
  document.querySelector("#next-page").addEventListener("click", async () => {
    if (currentPage < pages) { currentPage++; try { await loadResponses(); } catch (error) { showError(error.message); } }
  });
  document.querySelector("#export-button").addEventListener("click", async () => {
    try {
      const response = await fetch(`/api/admin/export.csv?${filterQuery()}`);
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Não foi possível exportar.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "respostas-pesquisa-senac.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { showError(error.message); }
  });
  document.querySelector("#logout-button").addEventListener("click", async () => {
    try { await fetch("/api/admin/logout", { method: "POST" }); window.location.assign("/admin/login"); }
    catch (error) { showError("Não foi possível encerrar a sessão."); }
  });
  document.querySelector("#close-dialog").addEventListener("click", () => responseDialog.close());
  responseDialog.addEventListener("click", (event) => { if (event.target === responseDialog) responseDialog.close(); });
  refresh();
})();
