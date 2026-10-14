(() => {
  const { courses, questionsByCourse } = window.SurveyQuestions;
  const startForm = document.querySelector("#start-form");
  const courseSelect = document.querySelector("#course-select");
  const otherWrap = document.querySelector("#other-course-wrap");
  const otherInput = document.querySelector("#other-course");
  const intro = document.querySelector("#intro");
  const survey = document.querySelector("#survey");
  const surveyForm = document.querySelector("#survey-form");
  const questionsContainer = document.querySelector("#questions-container");
  let selectedCourse = null;

  for (const course of courses) {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.append(option);
  }
  courseSelect.addEventListener("change", () => {
    const isOther = courseSelect.value === "outros";
    otherWrap.hidden = !isOther;
    otherInput.required = isOther;
  });

  function addQuestion(question, index) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "question-field";
    const legend = document.createElement("legend");
    legend.textContent = `${index + 1}. ${question.label}`;
    if (question.required) {
      const required = document.createElement("span");
      required.className = "required";
      required.textContent = " *";
      legend.append(required);
    }
    fieldset.append(legend);
    if (question.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.name = question.id;
      textarea.rows = 3;
      textarea.maxLength = 2000;
      textarea.placeholder = "Escreva sua resposta (opcional)";
      textarea.setAttribute("aria-label", question.label);
      fieldset.append(textarea);
    } else {
      const choices = document.createElement("div");
      choices.className = "choice-list";
      for (const [choiceIndex, optionText] of question.options.entries()) {
        const label = document.createElement("label");
        label.className = "choice-option";
        const input = document.createElement("input");
        input.type = question.type;
        input.name = question.id;
        input.value = optionText;
        input.required = question.required && (question.type === "radio" || choiceIndex === 0);
        const span = document.createElement("span");
        span.textContent = optionText;
        label.append(input, span);
        choices.append(label);
      }
      fieldset.append(choices);
    }
    questionsContainer.append(fieldset);
  }

  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!startForm.reportValidity()) return;
    selectedCourse = courses.find((course) => course.id === courseSelect.value);
    questionsContainer.replaceChildren();
    const questions = questionsByCourse[selectedCourse.id];
    questions.forEach(addQuestion);
    document.querySelector("#survey-course").textContent = selectedCourse.id === "outros"
      ? otherInput.value.trim() : selectedCourse.name;
    document.querySelector("#question-count").textContent = `${questions.length} perguntas`;
    document.querySelector("#progress-bar").style.width = "100%";
    intro.hidden = true;
    survey.hidden = false;
    survey.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#back-button").addEventListener("click", () => {
    survey.hidden = true;
    intro.hidden = false;
    intro.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  surveyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!surveyForm.reportValidity()) return;
    const submitButton = document.querySelector("#submit-button");
    const error = document.querySelector("#form-error");
    const answers = {};
    for (const question of questionsByCourse[selectedCourse.id]) {
      if (question.type === "textarea") {
        const value = surveyForm.elements[question.id].value.trim();
        if (value) answers[question.id] = value;
      } else if (question.type === "checkbox") {
        const group = surveyForm.querySelectorAll(`input[name="${question.id}"]:checked`);
        if (group.length) answers[question.id] = Array.from(group, (input) => input.value);
      } else {
        const input = surveyForm.querySelector(`input[name="${question.id}"]:checked`);
        if (input) answers[question.id] = input.value;
      }
    }
    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    error.hidden = true;
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...(selectedCourse.id === "outros" ? { otherCourseName: otherInput.value.trim() } : {}),
          answers
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar as respostas.");
      survey.hidden = true;
      document.querySelector("#success").hidden = false;
      document.querySelector("#success").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      error.textContent = requestError.message || "Falha de conexão. Tente novamente.";
      error.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Enviar respostas <span aria-hidden="true">→</span>';
    }
  });
})();
