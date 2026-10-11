const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Cores disponíveis para o herói
const CORES_DISPONIVEIS = ["#2196F3", "#E91E63", "#9C27B0", "#00BCD4", "#FF9800", "#4CAF50"];
let corSelecionada = CORES_DISPONIVEIS[0];

// Tipos de inimigos
const TIPOS_INIMIGOS = [
    { name: "Lorde Escudo", shape: "rectangle", color: "#f44336", hpMult: 1.4, atkMult: 0.8 },
    { name: "Espectro Perfuro", shape: "triangle", color: "#FF9800", hpMult: 0.7, atkMult: 1.4 },
    { name: "Orbe Mágico", shape: "circle", color: "#9C27B0", hpMult: 1.0, atkMult: 1.0 }
];

// -------------------------------------------------------------
// FÓRMULAS MATEMÁTICAS DE ESCALONAMENTO
// -------------------------------------------------------------
function calcularXpNecessario(level) {
    return Math.floor(100 * Math.pow(1.35, level - 1));
}

function calcularHpJogador(level) {
    return Math.floor(110 * Math.pow(1.20, level - 1));
}

function calcularAtaqueBaseJogador(level) {
    return Math.floor(22 * Math.pow(1.25, level - 1));
}

function calcularAtributosInimigo(stage, tipo) {
    const fatorFase = Math.pow(stage, 1.15);
    const hpBase = Math.floor((30 + fatorFase * 14) * tipo.hpMult);
    const atkBase = Math.floor((4 + fatorFase * 3.0) * tipo.atkMult);
    const xpReward = Math.floor(35 + fatorFase * 22);

    return { hp: hpBase, atk: atkBase, xp: xpReward };
}

// Estado do Jogo
const state = {
    stage: 1,
    turn: "hero",
    targetEnemyIndex: 0,
    message: "A aventura começa! Enfrente as lendas.",
    player: {
        name: "Herói",
        color: "#2196F3",
        level: 1,
        xp: 0,
        nextLvlXp: calcularXpNecessario(1),
        hp: calcularHpJogador(1),
        maxHp: calcularHpJogador(1),
        baseAttack: calcularAtaqueBaseJogador(1),
        equippedWeapon: null,
        x: 100,
        y: 180,
        inventory: [
            { id: 1, name: "Poção Grande (+55 HP)", type: "heal", value: 55 },
            { id: 2, name: "Espada Curta (+10 Atq)", type: "weapon", value: 10 }
        ]
    },
    enemies: []
};

function getAtaqueTotalJogador() {
    const bonusArma = state.player.equippedWeapon ? state.player.equippedWeapon.value : 0;
    return state.player.baseAttack + bonusArma;
}

// --- TRANSIÇÃO DE TELAS ---
function irParaCriacao() {
    document.getElementById("titleScreen").classList.remove("active");
    document.getElementById("startScreen").classList.add("active");
    renderColorPicker();
}

function renderColorPicker() {
    const container = document.getElementById("colorPicker");
    container.innerHTML = "";
    CORES_DISPONIVEIS.forEach((cor, index) => {
        const btn = document.createElement("div");
        btn.className = `color-btn ${index === 0 ? "selected" : ""}`;
        btn.style.backgroundColor = cor;
        btn.onclick = () => {
            document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            corSelecionada = cor;
        };
        container.appendChild(btn);
    });
}

function iniciarJogo() {
    const nomeInput = document.getElementById("playerNameInput").value.trim();
    state.player.name = nomeInput || "Herói";
    state.player.color = corSelecionada;

    document.getElementById("startScreen").classList.remove("active");
    document.getElementById("gameScreen").classList.add("active");
    document.getElementById("heroNameDisplay").innerText = state.player.name;

    gerarFase();
    atualizarUI();
    draw();
}

// --- SISTEMA DE FASES E INIMIGOS ---
function gerarFase() {
    state.enemies = [];
    state.targetEnemyIndex = 0;
    state.turn = "hero";

    const qtdInimigos = Math.min(3, 1 + Math.floor((state.stage - 1) / 2));

    for (let i = 0; i < qtdInimigos; i++) {
        const tipo = TIPOS_INIMIGOS[Math.floor(Math.random() * TIPOS_INIMIGOS.length)];
        const stats = calcularAtributosInimigo(state.stage, tipo);

        state.enemies.push({
            name: `${tipo.name} ${i + 1}`,
            shape: tipo.shape,
            color: tipo.color,
            hp: stats.hp,
            maxHp: stats.hp,
            attack: stats.atk,
            xpReward: stats.xp,
            x: 550 + (i * 70),
            y: 120 + (i * 70),
            alive: true
        });
    }

    state.message = `Fase ${state.stage}: Enfrente ${qtdInimigos} inimigo(s)!`;
}

// --- DESENHO NO CANVAS ---
function desenharInimigo(enemy, isFocused) {
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = isFocused ? "#FFD700" : "#ffffff";
    ctx.lineWidth = isFocused ? 4 : 1;

    const size = 30;

    if (enemy.shape === "rectangle") {
        ctx.fillRect(enemy.x - 20, enemy.y - 30, 40, 60);
        ctx.strokeRect(enemy.x - 20, enemy.y - 30, 40, 60);
    } else if (enemy.shape === "circle") {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, size / 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (enemy.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - size);
        ctx.lineTo(enemy.x - size, enemy.y + size);
        ctx.lineTo(enemy.x + size, enemy.y + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Herói
    if (state.player.hp > 0) {
        ctx.fillStyle = state.player.color;
        ctx.fillRect(state.player.x - 20, state.player.y - 20, 40, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "14px monospace";
        ctx.fillText(`${state.player.name}`, state.player.x - 25, state.player.y - 30);
    }

    // Inimigos
    state.enemies.forEach((enemy, index) => {
        if (enemy.alive) {
            const isFocused = (index === state.targetEnemyIndex);
            desenharInimigo(enemy, isFocused);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(enemy.name, enemy.x - 30, enemy.y - 40);
            ctx.fillText(`${enemy.hp}/${enemy.maxHp} HP`, enemy.x - 25, enemy.y + 45);
        }
    });

    // Mensagem Superior
    ctx.fillStyle = "#FFEB3B";
    ctx.font = "15px monospace";
    ctx.fillText(state.message, 20, 30);
}

// --- COMBATE ---
function atacarInimigo() {
    if (state.turn !== "hero") return;

    const target = state.enemies[state.targetEnemyIndex];
    if (!target || !target.alive) return;

    const dano = getAtaqueTotalJogador();
    target.hp -= dano;
    state.message = `💥 Você causou ${dano} de dano em ${target.name}!`;

    if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        state.message += ` ${target.name} foi derrotado!`;
        
        const proximoInimigo = state.enemies.findIndex(e => e.alive);
        if (proximoInimigo !== -1) state.targetEnemyIndex = proximoInimigo;
    }

    atualizarUI();
    draw();

    if (state.enemies.every(e => !e.alive)) {
        vitoriaFase();
        return;
    }

    state.turn = "enemy";
    setTimeout(turnoDosInimigos, 1000);
}

function turnoDosInimigos() {
    let danoTotal = 0;
    state.enemies.forEach(enemy => {
        if (enemy.alive) {
            state.player.hp -= enemy.attack;
            danoTotal += enemy.attack;
        }
    });

    if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.message = "Você caiu em batalha... Game Over!";
        state.turn = "gameover";
    } else {
        state.message = `Inimigos atacaram! Você recebeu ${danoTotal} de dano.`;
        state.turn = "hero";
    }

    atualizarUI();
    draw();
}

// --- RECOMPENSAS & LOOT ---
function vitoriaFase() {
    state.turn = "win";
    let xpGanha = state.enemies.reduce((sum, e) => sum + e.xpReward, 0);
    state.player.xp += xpGanha;

    let lootMsg = "";
    const rand = Math.random();

    if (rand < 0.45) {
        const curaValor = Math.floor(state.player.maxHp * 0.5);
        state.player.inventory.push({ 
            id: Date.now(), 
            name: `Poção Grande (+${curaValor} HP)`, 
            type: "heal", 
            value: curaValor 
        });
        lootMsg = " 🧪 Encontrou Poção Grande!";
    } else if (rand < 0.85) {
        const atqBonus = Math.floor(10 + state.stage * 4);
        state.player.inventory.push({ 
            id: Date.now(), 
            name: `Lâmina da Fase ${state.stage} (+${atqBonus} Atq)`, 
            type: "weapon", 
            value: atqBonus 
        });
        lootMsg = ` ⚔️ Encontrou Nova Arma (+${atqBonus} Atq)!`;
    }

    state.message = `Vitória! +${xpGanha} XP.${lootMsg}`;

    while (state.player.xp >= state.player.nextLvlXp) {
        state.player.level++;
        state.player.xp -= state.player.nextLvlXp;

        state.player.nextLvlXp = calcularXpNecessario(state.player.level);
        state.player.maxHp = calcularHpJogador(state.player.level);
        state.player.hp = state.player.maxHp; 
        state.player.baseAttack = calcularAtaqueBaseJogador(state.player.level);

        state.message += ` 🌟 LEVEL UP (Nível ${state.player.level})! Atributos Aumentados!`;
    }

    atualizarUI();
    draw();
}

function proximaFase() {
    state.stage++;
    gerarFase();
    atualizarUI();
    draw();
}

// --- GERENCIAMENTO DO INVENTÁRIO ---
function interagirComItem(id) {
    if (state.turn !== "hero") return;

    const itemIndex = state.player.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) return;

    const item = state.player.inventory[itemIndex];

    if (item.type === "heal") {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.value);
        state.message = `Você usou ${item.name}!`;
        state.player.inventory.splice(itemIndex, 1);
        
        state.turn = "enemy";
        setTimeout(turnoDosInimigos, 1000);
    } 
    else if (item.type === "weapon") {
        state.player.inventory.splice(itemIndex, 1);

        if (state.player.equippedWeapon) {
            state.player.inventory.push(state.player.equippedWeapon);
        }

        state.player.equippedWeapon = item;
        state.message = `Você equipou ${item.name}! (+${item.value} Atq)`;
    }

    atualizarUI();
    draw();
}

function desequiparArma() {
    if (!state.player.equippedWeapon) return;

    state.player.inventory.push(state.player.equippedWeapon);
    state.message = `Você desequipou ${state.player.equippedWeapon.name}.`;
    state.player.equippedWeapon = null;

    atualizarUI();
    draw();
}

function descartarItem(id) {
    const itemIndex = state.player.inventory.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        const removido = state.player.inventory.splice(itemIndex, 1)[0];
        state.message = `Você descartou: ${removido.name}.`;
        atualizarUI();
    }
}

// --- ATUALIZAR INTERFACE ---
function atualizarUI() {
    document.getElementById("stageNum").innerText = state.stage;
    document.getElementById("heroLvl").innerText = state.player.level;
    document.getElementById("heroXp").innerText = state.player.xp;
    document.getElementById("heroHp").innerText = state.player.hp;
    document.getElementById("heroMaxHp").innerText = state.player.maxHp;
    
    const bonusArma = state.player.equippedWeapon ? state.player.equippedWeapon.value : 0;
    const atqTotal = getAtaqueTotalJogador();
    document.getElementById("heroAtk").innerText = bonusArma > 0 
        ? `${atqTotal} (${state.player.baseAttack} + ${bonusArma})`
        : `${atqTotal}`;

    const actionContainer = document.getElementById("actionButtons");
    if (state.turn === "win") {
        actionContainer.innerHTML = `<button onclick="proximaFase()">Avançar para Fase ${state.stage + 1}</button>`;
    } else if (state.turn === "gameover") {
        actionContainer.innerHTML = `<button class="btn-danger" onclick="location.reload()">Reiniciar Jogo</button>`;
    } else {
        actionContainer.innerHTML = `<button id="btnAttack" onclick="atacarInimigo()" ${state.turn !== 'hero' ? 'disabled' : ''}>Atacar Inimigo Focado</button>`;
    }

    const enemiesDiv = document.getElementById("enemiesStatus");
    enemiesDiv.innerHTML = "";
    state.enemies.forEach((enemy, index) => {
        if (enemy.alive) {
            const btn = document.createElement("button");
            btn.style.padding = "3px 6px";
            btn.style.fontSize = "11px";
            btn.innerText = `Focar ${enemy.name}`;
            if (index === state.targetEnemyIndex) btn.style.border = "2px solid #FFD700";
            btn.onclick = () => { state.targetEnemyIndex = index; draw(); atualizarUI(); };
            
            enemiesDiv.appendChild(document.createTextNode(`${enemy.name}: ${enemy.hp} HP `));
            enemiesDiv.appendChild(btn);
            enemiesDiv.appendChild(document.createElement("br"));
        }
    });

    const invContainer = document.getElementById("inventoryList");
    invContainer.innerHTML = "";

    if (state.player.equippedWeapon) {
        const equippedCard = document.createElement("div");
        equippedCard.className = "item-card";
        equippedCard.style.border = "2px solid #FFD700";

        const label = document.createElement("span");
        label.innerText = `🗡️ Equipada: ${state.player.equippedWeapon.name} `;

        const btnUnequip = document.createElement("button");
        btnUnequip.innerText = "Desequipar";
        btnUnequip.onclick = desequiparArma;

        equippedCard.appendChild(label);
        equippedCard.appendChild(btnUnequip);
        invContainer.appendChild(equippedCard);
    }

    if (state.player.inventory.length === 0 && !state.player.equippedWeapon) {
        invContainer.innerText = "Nenhum item no inventário.";
    } else {
        state.player.inventory.forEach(item => {
            const card = document.createElement("div");
            card.className = "item-card";

            const btnAction = document.createElement("button");
            btnAction.innerText = item.type === "weapon" ? `Equipar ${item.name}` : `Usar ${item.name}`;
            btnAction.disabled = state.turn !== "hero";
            btnAction.onclick = () => interagirComItem(item.id);

            const btnDiscard = document.createElement("button");
            btnDiscard.innerText = "🗑️";
            btnDiscard.title = "Descartar item";
            btnDiscard.className = "btn-discard";
            btnDiscard.onclick = () => descartarItem(item.id);

            card.appendChild(btnAction);
            card.appendChild(btnDiscard);
            invContainer.appendChild(card);
        });
    }
}