const packCharacters = [
  { name: 'QUILL', role: 'Overseer/Coherence', function: 'Coordinates constitutional consistency', contribution: 'Checks whole-system coherence before decision' },
  { name: 'RUNE', role: 'Systems Architect/Structure', function: 'Shapes interfaces, contracts, and boundaries', contribution: 'Keeps the gate contract structurally sound' },
  { name: 'ZYRA', role: 'Crypto/Innovation', function: 'Explores stronger technical evidence mechanisms', contribution: 'Improves evidence quality without becoming authority' },
  { name: 'VERA', role: 'Feasibility/Reality Check', function: 'Tests viability against reality', contribution: 'Challenges impractical assumptions in decisions' },
  { name: 'MAVEN', role: 'Knowledge/Curation', function: 'Curates context and retrieval', contribution: 'Supplies knowledge inputs without minting authority' },
  { name: 'ARIA', role: 'Meaning/Expression', function: 'Turns system state into human-facing explanation', contribution: 'Makes outcomes understandable' },
  { name: 'LYRA', role: 'Human Intelligence/Context', function: 'Maintains human-centered reasoning', contribution: 'Protects usability and operator clarity' },
  { name: 'SOL', role: 'Operations/Momentum', function: 'Coordinates approved operational flow', contribution: 'Moves allowed work toward runtime without granting permission' },
  { name: 'TALON', role: 'Security/Adversarial', function: 'Assumes hostile conditions and ambiguity', contribution: 'Tests boundary failures and abuse cases' },
  { name: 'KAI', role: 'Engineering/Implementation', function: 'Builds the actual systems', contribution: 'Turns contracts into executable implementations' },
  { name: 'SAGE', role: 'Learning/Evaluation', function: 'Evaluates patterns and feedback', contribution: 'Improves models while respecting gate boundaries' },
  { name: 'NARA', role: 'Strategy/Synthesis', function: 'Connects present decisions to long-horizon outcomes', contribution: 'Frames system trade-offs and opportunity' },
  { name: 'NYX', role: 'Boundary/Anomaly', function: 'Represents unknowns and edge cases', contribution: 'Surfaces exceptional states for careful handling' },
];

const scenarios = [
  { id: '01', title: 'TEST 01', summary: 'C=1, P=1, A=0 → DENY', predicates: { C: true, P: true, A: false, T: false, S: true, R: true, E: true }, result: 'DENY' },
  { id: '02', title: 'TEST 02', summary: 'Verify(pi)=1, Authority=0 → DENY', predicates: { C: true, P: true, A: false, T: false, S: true, R: true, E: true }, result: 'DENY' },
  { id: '03', title: 'TEST 03', summary: 'TPM quote valid, Authority=0 → DENY', predicates: { C: true, P: true, A: false, T: false, S: true, R: true, E: true }, result: 'DENY' },
  { id: '04', title: 'TEST 04', summary: 'Capability=1, Authority=0 → DENY', predicates: { C: true, P: true, A: false, T: false, S: true, R: true, E: true }, result: 'DENY' },
  { id: '05', title: 'TEST 05', summary: 'Authority=1, Evidence=0 → DENY', predicates: { C: true, P: true, A: true, T: false, S: true, R: true, E: false }, result: 'DENY' },
  { id: '06', title: 'TEST 06', summary: 'Subject mismatch → DENY', predicates: { C: true, P: true, A: true, T: true, S: false, R: true, E: true }, result: 'DENY' },
  { id: '07', title: 'TEST 07', summary: 'Lease expired → DENY', predicates: { C: true, P: true, A: false, T: false, S: true, R: true, E: true }, result: 'DENY' },
  { id: '08', title: 'TEST 08', summary: 'All predicates satisfied → ALLOW', predicates: { C: true, P: true, A: true, T: true, S: true, R: true, E: true }, result: 'ALLOW' },
  { id: '09', title: 'TEST 09', summary: 'Gate=ALLOW, Runtime=FAILURE', predicates: { C: true, P: true, A: true, T: true, S: true, R: true, E: true }, result: 'ALLOW', runtime: 'FAILED' },
  { id: '10', title: 'TEST 10', summary: 'Conflicting evidence → HUMAN_REVIEW', predicates: { C: true, P: true, A: true, T: true, S: true, R: true, E: false }, result: 'HUMAN_REVIEW' },
];

const nodeDescriptions = {
  C: 'Capability: can the actor technically perform the requested action?',
  P: 'Policy: do the standing rules permit this request?',
  A: 'Authority: is there a valid lease from the sovereign authority?',
  T: 'Temporal validity: are lease and evidence active at the evaluation time?',
  S: 'Subject: do actor identity and evidence subject line up?',
  R: 'Required constraints: do lease constraints satisfy the request?',
  E: 'Evidence: did a technology-neutral adapter produce valid evidence?',
  G: 'Gate result: G = C ∧ P ∧ A ∧ T ∧ S ∧ R ∧ E. Gate decides; runtime does not modify it.',
};

const scenarioButtons = document.getElementById('scenario-buttons');
const detailTitle = document.getElementById('detail-title');
const detailBody = document.getElementById('detail-body');
const gateResult = document.getElementById('gate-result');
const packGrid = document.getElementById('pack-grid');
const nodes = [...document.querySelectorAll('.node')];
let selectedScenario = scenarios[0];
let selectedNode = 'G';

function renderScenarioButtons() {
  scenarioButtons.innerHTML = '';
  for (const scenario of scenarios) {
    const button = document.createElement('button');
    button.textContent = `${scenario.title}: ${scenario.result}`;
    button.className = scenario.id === selectedScenario.id ? 'active' : '';
    button.addEventListener('click', () => {
      selectedScenario = scenario;
      renderScenarioButtons();
      updateResultPill();
      renderDetail();
      paintNodes();
    });
    scenarioButtons.appendChild(button);
  }
}

function updateResultPill() {
  gateResult.textContent = selectedScenario.runtime ? `${selectedScenario.result} / runtime ${selectedScenario.runtime}` : selectedScenario.result;
  gateResult.className = `result-pill ${selectedScenario.result === 'ALLOW' ? 'allow' : selectedScenario.result === 'HUMAN_REVIEW' ? 'review' : 'deny'}`;
}

function renderDetail() {
  detailTitle.textContent = `${selectedScenario.title} · ${selectedNode}`;
  const predicateSnapshot = selectedNode === 'G'
    ? JSON.stringify(selectedScenario.predicates, null, 2)
    : JSON.stringify({ [selectedNode]: selectedScenario.predicates[selectedNode] }, null, 2);
  const extras = [
    `<strong>${selectedScenario.summary}</strong>`,
    `<span>${nodeDescriptions[selectedNode]}</span>`,
    `<pre>${predicateSnapshot}</pre>`,
  ];
  if (selectedNode === 'G' && selectedScenario.runtime) {
    extras.push(`<span>Runtime status: ${selectedScenario.runtime}. The gate remains ${selectedScenario.result}.</span>`);
  }
  detailBody.innerHTML = extras.join('');
}

function paintNodes() {
  for (const node of nodes) {
    const key = node.dataset.node;
    node.classList.toggle('active', key === selectedNode);
    if (key === 'G') {
      node.style.borderColor = selectedScenario.result === 'ALLOW' ? 'var(--allow)' : selectedScenario.result === 'HUMAN_REVIEW' ? 'var(--review)' : 'var(--deny)';
      continue;
    }
    const satisfied = selectedScenario.predicates[key];
    node.style.borderColor = satisfied ? 'var(--allow)' : 'var(--deny)';
    node.style.background = satisfied ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)';
  }
}

function renderPack() {
  for (const character of packCharacters) {
    const button = document.createElement('button');
    button.innerHTML = `<strong>${character.name}</strong><br><small>${character.role}</small>`;
    button.addEventListener('click', () => {
      detailTitle.textContent = `${character.name} · Pack role`;
      detailBody.innerHTML = [
        `<strong>${character.role}</strong>`,
        `<span>${character.function}</span>`,
        `<span>${character.contribution}</span>`,
      ].join('');
    });
    packGrid.appendChild(button);
  }
}

for (const node of nodes) {
  node.addEventListener('click', () => {
    selectedNode = node.dataset.node;
    renderDetail();
    paintNodes();
  });
}

renderScenarioButtons();
updateResultPill();
renderDetail();
paintNodes();
renderPack();
