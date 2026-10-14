const courses = [
  { id: "design-interiores", name: "Técnico em Design de Interiores" },
  { id: "enfermagem", name: "Técnico em Enfermagem" },
  { id: "massoterapia", name: "Técnico em Massoterapia" },
  { id: "modelagem-vestuario", name: "Técnico em Modelagem do Vestuário" },
  { id: "podologia", name: "Técnico em Podologia" },
  { id: "recursos-humanos", name: "Técnico em Recursos Humanos" },
  { id: "farmacia", name: "Técnico em Farmácia" },
  { id: "outros", name: "Outros cursos técnicos" }
];

const choice = (id, label, options, required = true) => ({
  id, label, type: "radio", options, required
});
const multi = (id, label, options, required = true) => ({
  id, label, type: "checkbox", options, required
});
const text = (id, label, required = false) => ({
  id, label, type: "textarea", required
});

const noDifficulty = ["Sim, uma ou mais atividades", "Não tenho percebido dificuldades", "Ainda não sei dizer"];
const questionsByCourse = {
  "design-interiores": [
    choice("etapa_trabalhosa", "Durante o desenvolvimento de um projeto, qual etapa é mais trabalhosa para você?", [
      "Levantamento de medidas no local.", "Pesquisa de fornecedores, materiais e preços.",
      "Montagem e formatação de orçamentos.", "Organização de PDFs, WhatsApp e e-mails de diferentes lojas.",
      "Nenhuma etapa é especialmente trabalhosa.", "Outra."
    ]),
    choice("registro_briefing", "Como você registraria atualmente as informações de um briefing de projeto?", [
      "Papel ou caderno.", "Google Forms ou ferramenta semelhante.",
      "Documento de texto ou notas no celular.", "Ainda não tive essa necessidade.", "Outro."
    ]),
    text("funcionalidade", "Se pudesse criar um sistema para facilitar a rotina de um designer de interiores, qual seria sua principal função?")
  ],
  enfermagem: [
    choice("dificuldades", "Você percebe processos manuais ou dificuldades em alguma destas atividades acadêmicas ou práticas?", [
      "Sim, no controle de materiais e insumos de laboratório.", "Sim, em atividades de atendimento simuladas, agendamento ou controle de faltas.",
      "Sim, em formulários, documentos ou avaliações acadêmicas.", "Não tenho percebido dificuldades.", "Ainda não sei dizer.", "Outra."
    ]),
    text("tarefa_facilitada", "Se houver alguma tarefa que poderia ser facilitada por um sistema, qual seria? (Não informe dados de pacientes ou informações pessoais.)"),
    text("funcionalidade", "Se pudesse criar um aplicativo para ajudar na rotina do curso, qual seria sua principal função? (Não informe dados de pacientes ou informações pessoais.)")
  ],
  farmacia: [
    choice("dificuldades", "Você percebe processos manuais ou dificuldades em alguma destas atividades acadêmicas ou práticas?", [
      "Sim, no controle de estoque e materiais de laboratório.", "Sim, em atividades de atendimento simuladas ou organização de atividades práticas.",
      "Sim, em formulários, documentos ou avaliações acadêmicas.", "Não tenho percebido dificuldades.", "Ainda não sei dizer.", "Outra."
    ]),
    text("tarefa_facilitada", "Se houver alguma tarefa que poderia ser facilitada por um sistema, qual seria? (Não informe dados pessoais ou informações de pacientes.)"),
    text("funcionalidade", "Se pudesse criar um aplicativo para ajudar na rotina do curso, qual seria sua principal função? (Não informe dados pessoais ou informações de pacientes.)")
  ],
  "modelagem-vestuario": [
    choice("fichas_tecnicas", "Como são montadas e gerenciadas as fichas técnicas nas atividades do curso?", [
      "Papel e prancheta.", "Planilhas.", "Editores de texto ou imagem.", "Sistemas especializados.", "Ainda não realizei essa atividade.", "Outro."
    ]),
    choice("calculos", "Como são feitos os cálculos de gradação e rendimento de tecido nas atividades do curso?", [
      "Manualmente, com réguas e calculadora.", "Sistemas digitais especializados.", "Planilhas automatizadas.", "Ainda não realizei essa atividade.", "Outro."
    ]),
    choice("etapa_trabalhosa", "Qual etapa é mais demorada ou propensa a erros para você?", [
      "Cálculo do custo total da peça.", "Atualização da ficha técnica.", "Cálculo de metragem e rendimento do tecido.",
      "Padronização das tabelas de medidas.", "Acompanhamento das etapas de produção.",
      "Nenhuma dessas etapas.", "Ainda não sei dizer.", "Outra."
    ]),
    text("funcionalidade", "Que função um aplicativo poderia ter para facilitar sua rotina de modelagem?")
  ],
  massoterapia: [
    choice("dificuldades", "Você percebe dificuldade para organizar materiais ou insumos usados nas atividades práticas?", noDifficulty.concat("Outra.")),
    choice("organizacao_pratica", "Como costuma ser organizada a participação em atividades práticas, demonstrações ou simulações?", [
      "Agenda ou calendário compartilhado.", "Recados ou mensagens.", "Planilha ou documento.", "Organização feita em aula.",
      "Ainda não participei de atividades práticas.", "Não tenho dificuldade nessa organização.", "Outro."
    ]),
    multi("tarefas", "Em quais atividades do curso um recurso digital poderia ser útil? (Marque as que se aplicam.)", [
      "Organização de materiais e insumos.", "Agendamento de atividades práticas ou simuladas.",
      "Controle acadêmico de estoque.", "Organização de tarefas e prazos.", "Não vejo necessidade no momento.", "Outra."
    ], false),
    text("funcionalidade", "Qual funcionalidade um sistema poderia oferecer para facilitar a rotina do curso?")
  ],
  podologia: [
    choice("dificuldades", "Você percebe dificuldade para organizar materiais ou insumos usados nas atividades práticas?", noDifficulty.concat("Outra.")),
    choice("organizacao_pratica", "Como costuma ser organizada a participação em atividades práticas, demonstrações ou simulações?", [
      "Agenda ou calendário compartilhado.", "Recados ou mensagens.", "Planilha ou documento.", "Organização feita em aula.",
      "Ainda não participei de atividades práticas.", "Não tenho dificuldade nessa organização.", "Outro."
    ]),
    multi("tarefas", "Em quais atividades do curso um recurso digital poderia ser útil? (Marque as que se aplicam.)", [
      "Organização de materiais e insumos.", "Agendamento de atividades práticas ou simuladas.",
      "Controle acadêmico de estoque.", "Organização de tarefas e prazos.", "Não vejo necessidade no momento.", "Outra."
    ], false),
    text("funcionalidade", "Qual funcionalidade um sistema poderia oferecer para facilitar a rotina do curso?")
  ],
  "recursos-humanos": [
    choice("dificuldades", "Você percebe dificuldade para organizar atividades acadêmicas ou profissionais relacionadas a RH?", noDifficulty.concat("Outra.")),
    multi("tarefas", "Em quais tarefas você usa ou poderia usar apoio para se organizar? (Marque as que se aplicam.)", [
      "Organização de currículos para atividades acadêmicas.", "Organização de documentos e arquivos.",
      "Acompanhamento de etapas de processos seletivos simulados ou acadêmicos.",
      "Planilhas e controle de atividades.", "Elaboração de relatórios.", "Não vejo necessidade no momento.", "Outra."
    ], false),
    choice("ferramentas", "Quais ferramentas você utiliza atualmente para organizar essas atividades?", [
      "Planilhas.", "Documentos de texto.", "Pastas físicas ou digitais.", "Sistemas especializados.",
      "Mais de uma dessas ferramentas.", "Não utilizo ferramentas específicas.", "Ainda não se aplica.", "Outra."
    ]),
    text("funcionalidade", "Qual funcionalidade um sistema poderia oferecer para facilitar a rotina do curso?")
  ],
  outros: [
    choice("etapa_trabalhosa", "Qual tarefa do seu curso técnico é mais trabalhosa para você?", [
      "Organizar materiais ou insumos.", "Realizar cálculos ou preencher planilhas.",
      "Preparar documentos, fichas ou relatórios.", "Acompanhar atividades práticas e prazos.",
      "Pesquisar informações e organizar arquivos.", "Nenhuma tarefa é especialmente trabalhosa.",
      "Ainda não sei dizer.", "Outra."
    ]),
    choice("ferramentas", "Quais ferramentas você utiliza atualmente para organizar tarefas do curso?", [
      "Papel ou caderno.", "Planilhas.", "Documentos de texto ou notas no celular.",
      "Aplicativos ou sistemas especializados.", "Mais de uma dessas ferramentas.",
      "Não utilizo ferramentas específicas.", "Outra."
    ]),
    choice("dificuldades", "Você percebe alguma dificuldade ou processo manual que poderia ser melhorado na rotina do curso?", [
      "Sim, em atividades práticas ou organização de materiais.", "Sim, em cálculos, registros ou planilhas.",
      "Sim, em documentos, formulários ou relatórios.", "Sim, na organização de tarefas e prazos.",
      "Não tenho percebido dificuldades.", "Ainda não sei dizer.", "Outra."
    ]),
    text("funcionalidade", "Que funcionalidade um sistema ou aplicativo poderia oferecer para facilitar a rotina do seu curso?")
  ]
};

if (typeof module !== "undefined") {
  module.exports = { courses, questionsByCourse };
}
if (typeof window !== "undefined") {
  window.SurveyQuestions = { courses, questionsByCourse };
}
