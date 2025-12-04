# Wash Royale Clone - Technical Specification

## 1. Project Overview
This document outlines the technical architecture for a browser-based Real-Time Strategy (RTS) game mimicking core mechanics of "Wash Royale". The game features a vertical battlefield where two players (Human vs. Basic AI) deploy units from a deck of cards to destroy the opposing King Tower while defending their own. Matches are time-limited and driven by an Elixir resource system.

## 2. Technology Architecture

### 2.1 Core Technology
*   **Language:** Vanilla JavaScript (ES6+).
*   **Markup/Style:** HTML5, CSS3 (for static UI overlay).
*   **Bundler:** None (Native ES Modules for simplicity) or Vite (optional for hot reloading, but plan assumes vanilla setup).

### 2.2 Rendering Engine Decision: **HTML5 Canvas API**
*   **Decision:** We will use the HTML5 `<canvas>` element for the game arena and unit rendering.
*   **Justification:**
    *   **Performance:** The DOM is heavy. Manipulating 20+ DOM nodes (units, projectiles, effects) 60 times a second triggers excessive reflows and repaints. Canvas allows for immediate mode rendering which is significantly more performant for real-time moving entities.
    *   **Control:** Canvas provides pixel-level control for collision debugging, projectile trajectories, and smooth interpolation, which is cumbersome with CSS transforms.
    *   **UI Separation:** We will use a "Hybrid" approach:
        *   **Game World:** `<canvas>` layer.
        *   **HUD (Cards, Elixir, Menus):** HTML DOM overlay. This allows us to use CSS Grid/Flexbox for responsive UI layout, which is hard to build inside a Canvas.

### 2.3 Game Loop
We will implement a fixed-timestep game loop using `requestAnimationFrame`.
*   **`update(deltaTime)`**: Handles logic (physics, cooldowns, AI). Run logic independent of frame rate to prevent faster PCs from running the game faster.
*   **`draw()`**: Renders the current state to the Canvas. Clears the screen and redraws all entities every frame.

### 2.4 State Management
A central `GameManager` singleton will hold the "Source of Truth".
*   **Pattern:** Observer Pattern / Event Bus.
*   **Flow:** UI Events (Card Click) -> Game Manager (Check Elixir/Validity) -> Spawn Entity -> Notify Render Loop.

## 3. Data Structures

### 3.1 Card Definitions (JSON Schema)
Static configuration defining unit properties.
```json
{
  "id": "giant",
  "name": "Giant",
  "type": "troop", // troop | building | spell
  "cost": 5,
  "stats": {
    "health": 2000,
    "damage": 120,
    "attackSpeed": 1.5, // Seconds between attacks
    "range": 0, // 0 for melee
    "speed": 1, // Tiles per second
    "targets": "buildings" // ground | air | buildings | all
  },
  "asset": "giant_sprite.png"
}
```

### 3.2 Game State Object
Dynamic state representing the current match.
```javascript
const GameState = {
  status: "PLAYING", // WAITING, PLAYING, OVER
  timeRemaining: 180, // Seconds
  frame: 0,
  
  player: {
    elixir: 5.0,
    deck: [/* Card IDs */],
    hand: [/* 4 Active Card Objects */],
    nextCard: /* Card ID */
  },
  
  enemy: {
    elixir: 5.0,
    // ... same structure
  },
  
  entities: [
    // All active units, towers, and projectiles
    {
      id: "u_123",
      type: "knight",
      owner: "player",
      position: { x: 100, y: 300 },
      health: 600,
      state: "MOVING", // IDLE, MOVING, ATTACKING
      targetId: null
    }
  ]
};
```

## 4. Game Logic Modules

### 4.1 Pathfinding & Movement
*   **Lane Logic:** The arena has two bridges. Units will have a simplified logic:
    *   Target nearest Enemy Building.
    *   Determine which "Lane" (Left/Right) based on spawn X position.
    *   Move towards the bridge of that lane, then towards the tower.
*   **Implementation:** Vector-based movement.
    *   `velocity = normalize(targetPos - currentPos) * speed`
    *   `position += velocity * deltaTime`

### 4.2 Collision Detection
*   **Type:** Circle-Circle Collision.
*   **Usage:**
    *   **Unit vs Unit:** "Soft" collision (pushing) to prevent unit stacking. Units should slide off each other slightly.
    *   **Attack Range:** Distance check `dist(u1, u2) <= u1.range`.
    *   **Spells (Arrows):** Circle intersection with units in the target area.

### 4.3 Combat Logic (Finite State Machine)
Each unit will operate on a state machine:
1.  **Find Target:** Scan entities for nearest valid target (within aggro range).
2.  **Move:** If target is out of range, move towards it.
3.  **Attack:** If in range and cooldown is ready, deal damage.
    *   *Note:* Projectiles (Arrows/Archer shots) are separate entities spawned on attack.
4.  **Die:** If health <= 0, play animation and remove from `entities` array.

## 5. UI/UX Design

### 5.1 Screen Layout
*   **Canvas Layer (Background):**
    *   Top: Enemy King Tower + 2 Princess Towers.
    *   Middle: River + 2 Bridges.
    *   Bottom: Player King Tower + 2 Princess Towers.
*   **DOM Layer (Overlay):**
    *   **Top Bar:** Timer (Center), Enemy Name.
    *   **Bottom Bar (Dashboard):**
        *   **Elixir Bar:** Progress bar (0-10) filling over time.
        *   **Card Hand:** 4 slots showing available cards. Click to select.
        *   **Next Card:** Small preview of the incoming card.

### 5.2 Controls
*   **Select:** Click card in hand (highlights card).
*   **Place:** Click valid area on Canvas.
    *   *Validation:* Can only place on "Player Side" (unless a Miner/Spell, though Spells like Arrows can be anywhere).

## 6. Step-by-Step Implementation Roadmap

### Phase 1: Project Setup & Game Loop
*   Create directory structure (`/src`, `/assets`, `index.html`).
*   Set up HTML5 Canvas and the `GameLoop` class.
*   Implement `deltaTime` calculation.

### Phase 2: Rendering Engine
*   Draw the Arena background (grass, river, bridges).
*   Implement a `Renderer` class that accepts an array of entities and draws simple colored shapes (circles/rectangles) representing units.

### Phase 3: Core Game State & Towers
*   Implement `GameState` object.
*   Place static "Tower" entities (King + Princess) on the board for both sides.
*   Render towers.

### Phase 4: Card & Elixir System
*   Create `CardManager`.
*   Implement Elixir regeneration logic (1 elixir every ~2.8s).
*   Build the DOM UI for the Elixir bar and Card Hand.
*   Implement "Card Selection" logic.

### Phase 5: Spawning & Unit Basics
*   Implement click-to-spawn logic (converts Card -> Entity).
*   Deduct Elixir cost.
*   Validate spawn position (only on player's side).

### Phase 6: Movement & Pathfinding
*   Implement `Unit` class.
*   Add movement logic: Move towards the nearest enemy tower.
*   Handle bridge crossing (waypoints).

### Phase 7: Combat System (Part 1 - Targeting)
*   Implement `findTarget()`: Units detect nearest enemy unit or building.
*   Implement State Machine (Move vs. Stop).

### Phase 8: Combat System (Part 2 - Attacking & Damage)
*   Implement Attack Speed cooldowns.
*   Implement `Health` reduction.
*   Implement Death (removal from array).
*   Implement Projectiles for Ranged units (Archers) and Towers.

### Phase 9: Specific Unit Behaviors & Spells
*   **Giant:** Only targets buildings, high HP.
*   **Arrows:** Implement Area of Effect (AOE) logic (instant damage in a radius).
*   **Archers/Cannons:** Implement specific stats.

### Phase 10: Enemy AI & Win Conditions
*   **AI:** Simple loop: If Elixir > Cost of available card, spawn it at a random valid X position.
*   **Win Logic:** End game when King Tower dies or Timer hits 0.
*   **Game Over Screen:** Simple overlay with "Victory" or "Defeat".
