/**
 * Constants & Configuration
 */
const CONFIG = {
    GAME_WIDTH: 400,
    GAME_HEIGHT: 600, // Reduced from 700
    TICK_RATE: 60,
    ELIXIR_RATE: 2.8, 
    MAX_ELIXIR: 10,
    COLORS: {
        GRASS: '#4CAF50',
        RIVER: '#2196F3',
        BRIDGE: '#795548',
        PATH: '#C19A6B',
        PLAYER_TOWER: '#2962FF',
        ENEMY_TOWER: '#D50000',
        BORDER: '#000000',
        HEALTH_BG: '#333333',
        HEALTH_FG: '#4CAF50',
        PROJECTILE: '#FFFF00',
        SPELL_TARGET_VALID: 'rgba(255, 0, 0, 0.3)',
        SPELL_TARGET_INVALID: 'rgba(100, 100, 100, 0.3)',
        
        KNIGHT: '#FFC107',
        GIANT: '#FF5722',
        PEKKA: '#673AB7',
        ARCHER: '#E91E63',
        ARROW: '#03A9F4',
        CANNON: '#795548',
        DAMAGE_TEXT: '#FFFFFF'
    },
    TOWER_SIZE: 40, 
    KING_TOWER_SIZE: 50,
    TOWER_HP: { PRINCESS: 1400, KING: 2400 }
};

const CARDS = {
    knight: { id: 'knight', name: 'Knight', cost: 3, type: 'troop', color: CONFIG.COLORS.KNIGHT, speed: 60, health: 1000, damage: 150, attackSpeed: 1.2, range: 0, radius: 12, targets: 'ground' }, 
    giant: { id: 'giant', name: 'Giant', cost: 5, type: 'troop', color: CONFIG.COLORS.GIANT, speed: 40, health: 3000, damage: 200, attackSpeed: 1.5, range: 0, radius: 18, targets: 'buildings' },   
    pekka: { id: 'pekka', name: 'P.E.K.K.A', cost: 7, type: 'troop', color: CONFIG.COLORS.PEKKA, speed: 35, health: 2500, damage: 600, attackSpeed: 1.8, range: 0, radius: 15, targets: 'ground' },
    archers: { id: 'archers', name: 'Archers', cost: 3, type: 'troop', color: CONFIG.COLORS.ARCHER, speed: 70, health: 300, damage: 80, attackSpeed: 1.0, range: 120, radius: 10, targets: 'all', projectileSpeed: 300 },
    arrows: { id: 'arrows', name: 'Arrows', cost: 3, type: 'spell', color: CONFIG.COLORS.ARROW, radius: 80, damage: 200, projectileSpeed: 400 },  
    cannon: { id: 'cannon', name: 'Cannon', cost: 3, type: 'building', color: CONFIG.COLORS.CANNON, health: 800, radius: 20, range: 150, damage: 100, attackSpeed: 0.8, targets: 'ground', projectileSpeed: 400 }
};

class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity || { x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 50 };
        this.life = 1.0; 
        this.size = Math.random() * 3 + 2;
    }
    update(dt) {
        this.x += this.velocity.x * (dt / 1000);
        this.y += this.velocity.y * (dt / 1000);
        this.life -= dt / 1000;
        this.size *= 0.95;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 0.8;
        this.velocity = { x: 0, y: -30 }; 
    }
    update(dt) {
        this.y += this.velocity.y * (dt / 1000);
        this.life -= dt / 1000;
    }
}

class Entity {
    constructor(id, x, y, team) {
        this.id = id;
        this.x = x; 
        this.y = y;
        this.team = team; 
        this.width = 20;
        this.height = 20;
        this.radius = 0;
        this.health = 0;
        this.maxHealth = 0;
        this.isDead = false;
        this.type = 'base';
        this.color = '#fff';
        this.hitFlashTimer = 0;
        this.pushX = 0;
        this.pushY = 0;
        this.mass = 1;
    }
    update(dt, gameState) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    }
    takeDamage(amount, gameState) {
        this.health -= amount;
        this.hitFlashTimer = 100; 
        if (gameState) {
            gameState.addFloatingText(this.x, this.y - 20, `-${amount}`);
            gameState.spawnParticles(this.x, this.y, this.color, 3);
        }
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            if (gameState) gameState.spawnParticles(this.x, this.y, this.color, 10); 
        }
    }
    applyPhysics(dt) {
        if (Math.abs(this.pushX) > 0.1 || Math.abs(this.pushY) > 0.1) {
            this.x += this.pushX;
            this.y += this.pushY;
            this.pushX *= 0.9; 
            this.pushY *= 0.9;
        }
    }
}

class Projectile extends Entity {
    constructor(id, x, y, target, damage, speed) {
        super(id, x, y, 'neutral');
        this.type = 'projectile';
        this.target = target; 
        this.damage = damage;
        this.speed = speed;
        this.targetPos = { x: target.x, y: target.y }; 
    }
    update(dt, gameState) {
        if (this.target.id && !this.target.isDead) {
            this.targetPos = { x: this.target.x, y: this.target.y };
        }
        const dx = this.targetPos.x - this.x;
        const dy = this.targetPos.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 10) {
            this.isDead = true;
            if (this.target.id && !this.target.isDead) {
                this.target.takeDamage(this.damage, gameState);
            }
        } else {
            const moveDist = this.speed * (dt/1000);
            this.x += (dx/dist) * moveDist;
            this.y += (dy/dist) * moveDist;
        }
    }
}

class SpellProjectile extends Entity {
    constructor(id, x, y, targetX, targetY, damage, radius, team) {
        super(id, x, y, team);
        this.type = 'spell_projectile';
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.radius = radius;
        this.speed = 500; 
    }
    update(dt, gameState) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 10) {
            this.isDead = true;
            this.explode(gameState);
        } else {
            const moveDist = this.speed * (dt/1000);
            this.x += (dx/dist) * moveDist;
            this.y += (dy/dist) * moveDist;
        }
    }
    explode(gameState) {
        gameState.spawnParticles(this.targetX, this.targetY, CONFIG.COLORS.ARROW, 20);
        gameState.entities.forEach(ent => {
            if (ent.type === 'unit' || ent.type === 'tower') {
                if (ent.team !== this.team && !ent.isDead) {
                    const dx = ent.x - this.targetX;
                    const dy = ent.y - this.targetY;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    if (d < this.radius + ent.radius) {
                        ent.takeDamage(this.damage, gameState);
                    }
                }
            }
        });
    }
}

class Tower extends Entity {
    constructor(id, x, y, team, towerType) {
        super(id, x, y, team);
        this.type = 'tower';
        this.towerType = towerType;
        this.mass = 1000; 
        if (towerType === 'princess') {
            this.width = CONFIG.TOWER_SIZE;
            this.height = CONFIG.TOWER_SIZE;
            this.health = CONFIG.TOWER_HP.PRINCESS;
            this.radius = 25;
            this.range = 200;
            this.damage = 80;
            this.attackSpeed = 0.8;
        } else {
            this.width = CONFIG.KING_TOWER_SIZE;
            this.height = CONFIG.KING_TOWER_SIZE;
            this.health = CONFIG.TOWER_HP.KING;
            this.radius = 35;
            this.range = 220;
            this.damage = 100;
            this.attackSpeed = 1.0;
        }
        this.maxHealth = this.health;
        this.color = team === 'player' ? CONFIG.COLORS.PLAYER_TOWER : CONFIG.COLORS.ENEMY_TOWER;
        this.attackTimer = 0;
        this.currentTarget = null;
    }
    update(dt, gameState) {
        super.update(dt, gameState);
        this.attackTimer -= dt / 1000;
        if (!this.currentTarget || this.currentTarget.isDead || this.getDist(this.currentTarget) > this.range) {
            this.currentTarget = this.findTarget(gameState);
        }
        if (this.currentTarget && this.attackTimer <= 0) {
            this.fireProjectile(gameState);
            this.attackTimer = this.attackSpeed;
        }
    }
    getDist(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    findTarget(gameState) {
        let bestTarget = null;
        let minDist = Infinity;
        gameState.entities.forEach(e => {
            if (e.team !== this.team && e.type === 'unit' && !e.isDead) {
                const d = this.getDist(e);
                if (d <= this.range && d < minDist) {
                    minDist = d;
                    bestTarget = e;
                }
            }
        });
        return bestTarget;
    }
    fireProjectile(gameState) {
        const id = `proj_${Math.random().toString(36).substr(2, 9)}`;
        const p = new Projectile(id, this.x, this.y, this.currentTarget, this.damage, 300);
        gameState.addEntity(p);
    }
}

class Unit extends Entity {
    constructor(id, x, y, team, cardId) {
        super(id, x, y, team);
        this.type = 'unit';
        this.cardId = cardId;
        const stats = CARDS[cardId];
        this.speed = stats.speed; 
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        this.range = stats.range;
        this.attackSpeed = stats.attackSpeed || 1.5;
        this.color = stats.color;
        this.radius = stats.radius;
        this.mass = stats.radius; 
        this.targetType = stats.targets;
        this.projectileSpeed = stats.projectileSpeed;
        this.state = 'MOVING';
        this.currentTarget = null;
        this.attackTimer = 0;
        this.lane = x < CONFIG.GAME_WIDTH / 2 ? 0 : 1;
    }
    update(dt, gameState) {
        super.update(dt, gameState);
        this.applyPhysics(dt);
        this.attackTimer -= dt / 1000;
        if (!this.currentTarget || this.currentTarget.isDead) {
            this.currentTarget = this.findTarget(gameState);
            this.state = 'MOVING';
        }
        if (this.currentTarget) {
            const dist = this.getDist(this.currentTarget);
            const rangeBuffer = this.radius + (this.currentTarget.radius || 20) + this.range;
            if (dist <= rangeBuffer) this.state = 'ATTACKING';
            else this.state = 'MOVING';
        } else {
            this.state = 'IDLE'; 
        }
        if (this.state === 'MOVING') this.move(dt, gameState);
        else if (this.state === 'ATTACKING') {
            if (this.attackTimer <= 0) {
                this.attack(gameState);
                this.attackTimer = this.attackSpeed;
            }
        }
    }
    getDist(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    findTarget(gameState) {
        let candidates = gameState.entities.filter(e => {
            if (e.team === this.team || e.isDead || e.type === 'projectile') return false;
            if (this.targetType === 'buildings' && e.type !== 'tower' && e.cardId !== 'cannon') return false;
            return true;
        });
        candidates.sort((a, b) => this.getDist(a) - this.getDist(b));
        return candidates[0] || null;
    }
    attack(gameState) {
        if (!this.currentTarget) return;
        if (this.range > 20) { 
            const id = `proj_${Math.random().toString(36).substr(2, 9)}`;
            const p = new Projectile(id, this.x, this.y, this.currentTarget, this.damage, this.projectileSpeed || 300);
            gameState.addEntity(p);
        } else { 
            this.currentTarget.takeDamage(this.damage, gameState);
        }
    }
    move(dt, gameState) {
        let tx = 0, ty = 0;
        const riverY = CONFIG.GAME_HEIGHT / 2;
        const isPlayer = this.team === 'player';
        
        // Check River Collision
        const riverTop = riverY - 20;
        const riverBottom = riverY + 20;
        
        // Bridge Zones (allow crossing here)
        const bridgeWidth = 40;
        const bridgeLeftX = (CONFIG.GAME_WIDTH * 0.25);
        const bridgeRightX = (CONFIG.GAME_WIDTH * 0.75);
        
        const inLeftBridge = (this.x > bridgeLeftX - bridgeWidth/2 && this.x < bridgeLeftX + bridgeWidth/2);
        const inRightBridge = (this.x > bridgeRightX - bridgeWidth/2 && this.x < bridgeRightX + bridgeWidth/2);
        const onBridge = inLeftBridge || inRightBridge;

        let useBridge = false;
        if (this.currentTarget) {
            const mySide = (this.y > riverY) ? 'bottom' : 'top';
            const targetSide = (this.currentTarget.y > riverY) ? 'bottom' : 'top';
            if (mySide !== targetSide) useBridge = true;
        } else {
             useBridge = isPlayer ? (this.y > riverY) : (this.y < riverY);
        }

        if (useBridge) {
            const bridgeLeft = { x: CONFIG.GAME_WIDTH * 0.25, y: riverY };
            const bridgeRight = { x: CONFIG.GAME_WIDTH * 0.75, y: riverY };
            const bridge = this.lane === 0 ? bridgeLeft : bridgeRight;
            
            // Distance to center of river
            const distToRiverY = Math.abs(this.y - riverY);

            if (distToRiverY < 40) {
                 // Near/On river. 
                 if (onBridge) {
                    // Safe to cross
                    if (this.currentTarget) {
                        tx = this.currentTarget.x;
                        ty = this.currentTarget.y;
                    } else {
                        tx = bridge.x;
                        ty = isPlayer ? 0 : CONFIG.GAME_HEIGHT; 
                    }
                 } else {
                    // Near river but NOT on bridge. Must funnel to bridge.
                    tx = bridge.x;
                    ty = bridge.y; 
                 }
            } else {
                tx = bridge.x;
                ty = bridge.y; 
            }
        } else {
            if (this.currentTarget) {
                tx = this.currentTarget.x;
                ty = this.currentTarget.y;
            }
        }
        
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 1) {
            const moveDist = this.speed * (dt / 1000);
            let nextX = this.x + (dx / dist) * moveDist;
            let nextY = this.y + (dy / dist) * moveDist;

            // Hard River Stop
            // If trying to step INTO river while NOT on bridge X, stop Y movement
            const nextOnBridge = (nextX > bridgeLeftX - bridgeWidth/2 && nextX < bridgeLeftX + bridgeWidth/2) || 
                                 (nextX > bridgeRightX - bridgeWidth/2 && nextX < bridgeRightX + bridgeWidth/2);
            
            if (!nextOnBridge && nextY > riverTop && nextY < riverBottom) {
                // Block Y movement if entering river zone
                // Allow X movement to slide towards bridge
                nextY = this.y; 
            }
            
            this.x = nextX;
            this.y = nextY;
        }
    }
}

class PlayerManager {
    constructor(team, isHuman = false, gameState) {
        this.team = team;
        this.isHuman = isHuman;
        this.gameState = gameState; 
        this.elixir = 5; 
        this.elixirTimer = 0;
        this.deck = ['knight', 'giant', 'pekka', 'archers', 'arrows', 'cannon'];
        this.hand = [];
        this.nextCard = null;
        this.aiActionTimer = 0;
        this.aiNextActionTime = 2000; 
        this.shuffleDeck();
        this.dealInitialHand();
        if (this.isHuman) {
            this.selectedCardIdx = -1; 
            this.uiElixirFill = document.getElementById('elixir-fill');
            this.uiElixirVal = document.getElementById('elixir-value');
            this.uiSlots = Array.from(document.querySelectorAll('.card-slot:not(.mini)'));
            this.uiNext = document.querySelector('.card-slot.mini');
            this.bindUI();
            this.renderHandUI();
        }
    }
    shuffleDeck() { this.deck.sort(() => Math.random() - 0.5); }
    dealInitialHand() {
        for (let i = 0; i < 4; i++) this.hand.push(this.deck.shift());
        this.nextCard = this.deck.shift();
    }
    cycleCard(handIndex) {
        const usedCardId = this.hand[handIndex];
        this.deck.push(usedCardId);
        this.hand[handIndex] = this.nextCard;
        this.nextCard = this.deck.shift();
        if (this.isHuman) {
            this.selectedCardIdx = -1;
            this.renderHandUI();
        }
    }
    update(dt, gameState) {
        if (this.elixir < CONFIG.MAX_ELIXIR) {
            this.elixirTimer += dt / 1000; 
            if (this.elixirTimer >= CONFIG.ELIXIR_RATE) {
                this.elixir += 1;
                this.elixirTimer = 0;
                if (this.elixir > CONFIG.MAX_ELIXIR) this.elixir = CONFIG.MAX_ELIXIR;
            }
        }
        if (this.isHuman) {
            this.updateUI();
        } else {
            this.aiActionTimer += dt;
            if (this.aiActionTimer >= this.aiNextActionTime) {
                this.attemptAiMove(gameState);
            }
        }
    }
    attemptAiMove(gameState) {
        const idx = Math.floor(Math.random() * this.hand.length);
        const cardId = this.hand[idx];
        const cardDef = CARDS[cardId];
        if (this.elixir >= cardDef.cost) {
            const lane = Math.random() > 0.5 ? 0.25 : 0.75;
            const x = CONFIG.GAME_WIDTH * lane + (Math.random() * 40 - 20); 
            const y = 120 + (Math.random() * 50); 
            gameState.playCard('enemy', idx, x, y);
            this.aiActionTimer = 0;
            this.aiNextActionTime = 2000 + Math.random() * 3000; 
        } else {
            this.aiNextActionTime += 500;
        }
    }
    bindUI() {
        this.uiSlots.forEach((slot, idx) => {
            slot.addEventListener('click', () => this.selectCard(idx));
        });
    }
    selectCard(index) {
        const cardId = this.hand[index];
        const cardDef = CARDS[cardId];
        if (this.elixir < cardDef.cost) return;
        this.selectedCardIdx = (this.selectedCardIdx === index) ? -1 : index;
        this.renderHandUI();
    }
    updateUI() {
        const pct = (this.elixir / CONFIG.MAX_ELIXIR) * 100;
        this.uiElixirFill.style.width = `${pct}%`;
        this.uiElixirVal.textContent = Math.floor(this.elixir);
        this.hand.forEach((cId, idx) => {
            const slot = this.uiSlots[idx];
            if (this.elixir < CARDS[cId].cost) {
                slot.style.opacity = '0.5';
                slot.style.cursor = 'not-allowed';
            } else {
                slot.style.opacity = '1';
                slot.style.cursor = 'pointer';
            }
        });
    }
    renderHandUI() {
        this.hand.forEach((cId, idx) => {
            const slot = this.uiSlots[idx];
            const card = CARDS[cId];
            slot.textContent = `${card.name}\n(${card.cost})`;
            slot.style.borderColor = this.selectedCardIdx === idx ? 'yellow' : '#777';
            slot.style.color = card.color;
            if (this.selectedCardIdx === idx) slot.classList.add('active');
            else slot.classList.remove('active');
        });
        const next = CARDS[this.nextCard];
        this.uiNext.textContent = next.name;
        this.uiNext.style.color = next.color;
    }
}

class GameState {
    constructor() {
        this.entities = []; 
        this.particles = []; 
        this.floatingTexts = []; 
        this.entityIdCounter = 0;
        this.timeRemaining = 180;
        this.gameOver = false;
        this.winner = null; 
        this.player = new PlayerManager('player', true, this);
        this.enemy = new PlayerManager('enemy', false, this); 
        this.initTowers();
    }
    initTowers() {
        const w = CONFIG.GAME_WIDTH;
        const h = CONFIG.GAME_HEIGHT;
        this.addEntity(new Tower('e_p_1', w * 0.25, 80, 'enemy', 'princess'));
        this.addEntity(new Tower('e_p_2', w * 0.75, 80, 'enemy', 'princess'));
        this.addEntity(new Tower('e_k_1', w * 0.5, 40, 'enemy', 'king'));
        this.addEntity(new Tower('p_p_1', w * 0.25, h - 80, 'player', 'princess'));
        this.addEntity(new Tower('p_p_2', w * 0.75, h - 80, 'player', 'princess'));
        this.addEntity(new Tower('p_k_1', w * 0.5, h - 40, 'player', 'king'));
    }
    addEntity(entity) { this.entities.push(entity); }
    spawnParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    addFloatingText(x, y, text) {
        this.floatingTexts.push(new FloatingText(x, y, text, CONFIG.COLORS.DAMAGE_TEXT));
    }
    update(dt) {
        if (this.gameOver) return;
        this.timeRemaining -= dt / 1000;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.checkTimeWin();
        }
        this.player.update(dt, this);
        this.enemy.update(dt, this); 
        this.entities.forEach(ent => ent.update(dt, this));
        this.particles.forEach(p => p.update(dt));
        this.floatingTexts.forEach(t => t.update(dt));
        this.resolveCollisions();
        this.checkWinCondition();
        this.entities = this.entities.filter(e => !e.isDead);
        this.particles = this.particles.filter(p => p.life > 0);
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
    }
    checkWinCondition() {
        const playerKing = this.entities.find(e => e.id === 'p_k_1');
        const enemyKing = this.entities.find(e => e.id === 'e_k_1');
        if (!playerKing || playerKing.health <= 0) {
            this.endGame('enemy');
        } else if (!enemyKing || enemyKing.health <= 0) {
            this.endGame('player');
        }
    }
    checkTimeWin() {
        let playerHP = 0;
        let enemyHP = 0;
        this.entities.forEach(e => {
            if (e.type === 'tower') {
                if (e.team === 'player') playerHP += e.health;
                else enemyHP += e.health;
            }
        });
        if (playerHP > enemyHP) this.endGame('player');
        else if (enemyHP > playerHP) this.endGame('enemy');
        else this.endGame('draw');
    }
    endGame(winner) {
        this.gameOver = true;
        this.winner = winner;
    }
    resolveCollisions() {
        const count = this.entities.length;
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const e1 = this.entities[i];
                const e2 = this.entities[j];
                if (e1.type === 'projectile' || e2.type === 'projectile' || e1.type === 'spell_projectile' || e2.type === 'spell_projectile') continue;
                if (e1.type === 'tower' && e2.type === 'tower') continue;
                const dx = e1.x - e2.x;
                const dy = e1.y - e2.y;
                const distSq = dx*dx + dy*dy;
                const minDist = e1.radius + e2.radius;
                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const fx = (dx / dist) * overlap * 0.5;
                    const fy = (dy / dist) * overlap * 0.5;
                    const m1 = e1.mass;
                    const m2 = e2.mass;
                    const totalMass = m1 + m2;
                    if (e1.type !== 'tower') {
                        e1.pushX += fx * (m2 / totalMass);
                        e1.pushY += fy * (m2 / totalMass);
                    }
                    if (e2.type !== 'tower') {
                        e2.pushX -= fx * (m1 / totalMass);
                        e2.pushY -= fy * (m1 / totalMass);
                    }
                }
            }
        }
    }
    playCard(playerId, cardIndex, x, y) {
        const manager = playerId === 'player' ? this.player : this.enemy;
        if (cardIndex < 0 || cardIndex >= manager.hand.length) return;
        const cardId = manager.hand[cardIndex];
        const cardDef = CARDS[cardId];
        const isPlayer = playerId === 'player';
        
        // Pocket Logic
        let validPlacement = true;
        if (cardDef.type !== 'spell') {
            const riverY = CONFIG.GAME_HEIGHT / 2;
            const baseValid = isPlayer ? (y > riverY) : (y < riverY);
            
            if (baseValid) {
                validPlacement = true;
            } else {
                // Check Pocket
                // Is there a destroyed enemy princess tower?
                if (isPlayer) {
                    // Player attacking Enemy. Check Enemy Princesses (Top)
                    const leftAlive = this.entities.some(e => e.id === 'e_p_1' && !e.isDead);
                    const rightAlive = this.entities.some(e => e.id === 'e_p_2' && !e.isDead);
                    
                    // If left is dead, can spawn left side up to a limit
                    // Simplified: Just check X/Y
                    if (!leftAlive && x < CONFIG.GAME_WIDTH/2 && y > 100) validPlacement = true;
                    else if (!rightAlive && x > CONFIG.GAME_WIDTH/2 && y > 100) validPlacement = true;
                    else validPlacement = false;

                } else {
                    // Enemy attacking Player (Bottom)
                    // Simplified AI doesn't use pocket yet really, but logic stands
                    const leftAlive = this.entities.some(e => e.id === 'p_p_1' && !e.isDead);
                    const rightAlive = this.entities.some(e => e.id === 'p_p_2' && !e.isDead);
                     if (!leftAlive && x < CONFIG.GAME_WIDTH/2 && y < CONFIG.GAME_HEIGHT - 100) validPlacement = true;
                    else if (!rightAlive && x > CONFIG.GAME_WIDTH/2 && y < CONFIG.GAME_HEIGHT - 100) validPlacement = true;
                    else validPlacement = false;
                }
            }
        }
        if (!validPlacement) return false;

        if (manager.elixir >= cardDef.cost) {
            manager.elixir -= cardDef.cost;
            manager.cycleCard(cardIndex);
            if (cardDef.type === 'spell') {
                this.spawnSpell(cardId, x, y, manager.team);
            } else {
                this.spawnUnit(cardId, x, y, manager.team);
            }
            return true;
        }
        return false;
    }
    spawnUnit(cardId, x, y, team) {
        if (cardId === 'archers') {
            this.addEntity(new Unit(`u_${this.entityIdCounter++}`, x - 15, y, team, cardId));
            this.addEntity(new Unit(`u_${this.entityIdCounter++}`, x + 15, y, team, cardId));
        } else {
            this.addEntity(new Unit(`u_${this.entityIdCounter++}`, x, y, team, cardId));
        }
    }
    spawnSpell(cardId, x, y, team) {
        const def = CARDS[cardId];
        const kingId = team === 'player' ? 'p_k_1' : 'e_k_1';
        const king = this.entities.find(e => e.id === kingId);
        const startX = king ? king.x : (CONFIG.GAME_WIDTH/2);
        const startY = king ? king.y : (team === 'player' ? CONFIG.GAME_HEIGHT : 0);
        const spell = new SpellProjectile(
            `spell_${this.entityIdCounter++}`, 
            startX, startY, 
            x, y, 
            def.damage, 
            def.radius, 
            team
        );
        this.addEntity(spell);
    }
}

class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = { x: 0, y: 0 };
        this.clickQueue = []; 
        this.canvas.addEventListener('mousemove', (e) => this.updateMousePos(e));
        this.canvas.addEventListener('mousedown', (e) => {
            this.updateMousePos(e);
            this.clickQueue.push({ x: this.mouse.x, y: this.mouse.y });
        });
    }
    updateMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
    }
    getClick() { return this.clickQueue.shift(); }
}

class Renderer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
    }
    clear() { this.ctx.clearRect(0, 0, this.width, this.height); } 
    
    drawArena() {
        const ctx = this.ctx;
        ctx.fillStyle = CONFIG.COLORS.GRASS;
        ctx.fillRect(0, 0, this.width, this.height);
        this.drawPaths();
        const riverH = 40;
        const riverY = (this.height / 2) - (riverH / 2);
        ctx.fillStyle = CONFIG.COLORS.RIVER;
        ctx.fillRect(0, riverY, this.width, riverH);
        const bridgeW = 40;
        const bridgeH = riverH + 10;
        const bridgeY = riverY - 5;
        const lbX = (this.width * 0.25) - (bridgeW/2);
        const rbX = (this.width * 0.75) - (bridgeW/2);
        ctx.fillStyle = CONFIG.COLORS.BRIDGE;
        ctx.fillRect(lbX, bridgeY, bridgeW, bridgeH);
        ctx.fillRect(rbX, bridgeY, bridgeW, bridgeH);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(lbX, bridgeY, bridgeW, bridgeH);
        ctx.strokeRect(rbX, bridgeY, bridgeW, bridgeH);
    }

    drawPaths() {
        const ctx = this.ctx;
        ctx.strokeStyle = CONFIG.COLORS.PATH;
        ctx.lineWidth = 30;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const w = this.width;
        const h = this.height;
        const riverY = h / 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 40); 
        ctx.lineTo(w * 0.25, 80); 
        ctx.lineTo(w * 0.25, riverY); 
        ctx.lineTo(w * 0.25, h - 80); 
        ctx.lineTo(w * 0.5, h - 40); 
        ctx.moveTo(w * 0.5, 40); 
        ctx.lineTo(w * 0.75, 80); 
        ctx.lineTo(w * 0.75, riverY); 
        ctx.lineTo(w * 0.75, h - 80); 
        ctx.lineTo(w * 0.5, h - 40); 
        ctx.moveTo(w * 0.25, 80);
        ctx.lineTo(w * 0.75, 80);
        ctx.moveTo(w * 0.25, h - 80);
        ctx.lineTo(w * 0.75, h - 80);
        ctx.stroke();
    }

    drawEntities(entities, particles, floatingTexts) {
        entities.sort((a, b) => a.y - b.y);
        entities.forEach(ent => {
            if (ent.type === 'tower') this.drawTower(ent);
            else if (ent.type === 'unit') this.drawUnit(ent);
            else if (ent.type === 'projectile') this.drawProjectile(ent);
            else if (ent.type === 'spell_projectile') this.drawSpell(ent);
        });
        particles.forEach(p => this.drawParticle(p));
        floatingTexts.forEach(t => this.drawText(t));
    }

    drawTower(t) {
        const ctx = this.ctx;
        const x = t.x - (t.width / 2);
        const y = t.y - (t.height / 2);
        ctx.fillStyle = (t.hitFlashTimer > 0) ? '#FFFFFF' : t.color;
        ctx.fillRect(x, y, t.width, t.height);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, t.width, t.height);
        if (t.health < t.maxHealth)
            this.drawHealthBar(t.x, t.y - (t.height/2) - 15, 50, t.health, t.maxHealth);
    }

    drawUnit(u) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fillStyle = (u.hitFlashTimer > 0) ? '#FFFFFF' : u.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = u.team === 'player' ? '#fff' : '#000';
        ctx.stroke();
        this.drawHealthBar(u.x, u.y - u.radius - 12, 30, u.health, u.maxHealth);
    }

    drawProjectile(p) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawSpell(p) {
        // Simple yellow trail
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
        ctx.fill();
        // Trail
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.x - p.targetX)*0.1, p.y - (p.y - p.targetY)*0.1);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawParticle(p) {
        const ctx = this.ctx;
        ctx.globalAlpha = p.life; 
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    drawText(t) {
        const ctx = this.ctx;
        ctx.globalAlpha = t.life; 
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1.0;
    }

    drawHealthBar(centerX, y, width, hp, maxHp) {
        if (hp <= 0) return;
        const ctx = this.ctx;
        const h = 6;
        const w = width;
        const x = centerX - (w / 2);
        const pct = Math.max(0, hp / maxHp);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = CONFIG.COLORS.HEALTH_BG;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = CONFIG.COLORS.HEALTH_FG;
        ctx.fillRect(x, y, w * pct, h);
    }
    
    drawTargeting(mouse, card) {
        if (!card || card.type !== 'spell') return;
        const ctx = this.ctx;
        const radius = card.radius || 80;
        
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.SPELL_TARGET_VALID; // Spells valid everywhere
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    drawGameOver(winner) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        if (winner === 'player') {
            ctx.fillStyle = '#4CAF50';
            ctx.fillText('VICTORY!', this.width / 2, this.height / 2);
        } else if (winner === 'enemy') {
            ctx.fillStyle = '#F44336';
            ctx.fillText('DEFEAT!', this.width / 2, this.height / 2);
        } else {
            ctx.fillStyle = '#FFF';
            ctx.fillText('DRAW!', this.width / 2, this.height / 2);
        }
        ctx.font = '20px Arial';
        ctx.fillStyle = '#CCC';
        ctx.fillText('Refresh to Play Again', this.width / 2, this.height / 2 + 40);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = CONFIG.GAME_WIDTH;
        this.canvas.height = CONFIG.GAME_HEIGHT;
        this.input = new InputHandler(this.canvas);
        this.renderer = new Renderer(this.canvas);
        this.state = new GameState();
        this.lastTime = 0;
        this.accumulatedTime = 0;
        this.timeStep = 1000 / CONFIG.TICK_RATE;
        this.loop = this.loop.bind(this);
        
        this.timerEl = document.getElementById('timer');
    }
    start() { requestAnimationFrame(this.loop); }
    update(dt) {
        const click = this.input.getClick();
        if (click && !this.state.gameOver) {
            const pManager = this.state.player;
            if (pManager.selectedCardIdx !== -1) {
                this.state.playCard('player', pManager.selectedCardIdx, click.x, click.y);
            }
        }
        this.state.update(dt);
        
        // Update Timer UI
        if (this.timerEl) {
            const t = Math.max(0, this.state.timeRemaining);
            const mins = Math.floor(t / 60);
            const secs = Math.floor(t % 60);
            this.timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }
    draw() {
        this.renderer.clear();
        this.renderer.drawArena();
        this.renderer.drawEntities(this.state.entities, this.state.particles, this.state.floatingTexts);
        
        // Draw Spell Targeting
        const pManager = this.state.player;
        if (pManager.selectedCardIdx !== -1) {
            const cardId = pManager.hand[pManager.selectedCardIdx];
            const card = CARDS[cardId];
            if (card.type === 'spell') {
                this.renderer.drawTargeting(this.input.mouse, card);
            }
        }
        
        if (this.state.gameOver) {
            this.renderer.drawGameOver(this.state.winner);
        }
    }
    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.accumulatedTime += deltaTime;
        while (this.accumulatedTime >= this.timeStep) {
            this.update(this.timeStep);
            this.accumulatedTime -= this.timeStep;
        }
        this.draw();
        if (!this.state.gameOver) requestAnimationFrame(this.loop);
        else this.draw(); 
    }
}

window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});
