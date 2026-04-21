# Graph Report - .  (2026-04-21)

## Corpus Check
- Corpus is ~8,349 words - fits in a single context window. You may not need a graph.

## Summary
- 123 nodes · 171 edges · 18 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Game Engine Core|Game Engine Core]]
- [[_COMMUNITY_Base Unit & State Machine|Base Unit & State Machine]]
- [[_COMMUNITY_Renderer|Renderer]]
- [[_COMMUNITY_Specific Buildings|Specific Buildings]]
- [[_COMMUNITY_Micro AI|Micro AI]]
- [[_COMMUNITY_Buildings & Macro AI|Buildings & Macro AI]]
- [[_COMMUNITY_Main Setup & UI Commands|Main Setup & UI Commands]]
- [[_COMMUNITY_Commander AI|Commander AI]]
- [[_COMMUNITY_Resources|Resources]]
- [[_COMMUNITY_Villager|Villager]]
- [[_COMMUNITY_Horseman|Horseman]]
- [[_COMMUNITY_MenAtArms|MenAtArms]]
- [[_COMMUNITY_Spearman|Spearman]]
- [[_COMMUNITY_Archer|Archer]]
- [[_COMMUNITY_Crossbowman|Crossbowman]]
- [[_COMMUNITY_Knight|Knight]]
- [[_COMMUNITY_UI & Dependencies|UI & Dependencies]]
- [[_COMMUNITY_Documentation|Documentation]]

## God Nodes (most connected - your core abstractions)
1. `GameEngine` - 21 edges
2. `Renderer` - 13 edges
3. `MicroAI` - 8 edges
4. `BaseUnit` - 8 edges
5. `StateMachine` - 6 edges
6. `gameLoop()` - 4 edges
7. `startBattle()` - 4 edges
8. `Commander` - 4 edges
9. `Building` - 4 edges
10. `ResourceNode` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Game Engine Core"
Cohesion: 0.16
Nodes (2): GameEngine, gameLoop()

### Community 1 - "Base Unit & State Machine"
Cohesion: 0.21
Nodes (2): BaseUnit, StateMachine

### Community 2 - "Renderer"
Cohesion: 0.24
Nodes (1): Renderer

### Community 3 - "Specific Buildings"
Cohesion: 0.15
Nodes (6): ArcheryRange, Barracks, Farm, House, Stable, TownCenter

### Community 4 - "Micro AI"
Cohesion: 0.47
Nodes (1): MicroAI

### Community 5 - "Buildings & Macro AI"
Cohesion: 0.25
Nodes (2): Building, MacroAI

### Community 6 - "Main Setup & UI Commands"
Cohesion: 0.47
Nodes (3): appendLog(), clearLog(), startBattle()

### Community 7 - "Commander AI"
Cohesion: 0.6
Nodes (1): Commander

### Community 8 - "Resources"
Cohesion: 0.4
Nodes (1): ResourceNode

### Community 9 - "Villager"
Cohesion: 0.5
Nodes (1): Villager

### Community 10 - "Horseman"
Cohesion: 0.67
Nodes (1): Horseman

### Community 11 - "MenAtArms"
Cohesion: 0.67
Nodes (1): MenAtArms

### Community 12 - "Spearman"
Cohesion: 0.67
Nodes (1): Spearman

### Community 13 - "Archer"
Cohesion: 0.67
Nodes (1): Archer

### Community 14 - "Crossbowman"
Cohesion: 0.67
Nodes (1): Crossbowman

### Community 15 - "Knight"
Cohesion: 0.67
Nodes (1): Knight

### Community 16 - "UI & Dependencies"
Cohesion: 1.0
Nodes (2): Game UI Dashboard, PixiJS v7

### Community 17 - "Documentation"
Cohesion: 1.0
Nodes (1): README

## Knowledge Gaps
- **3 isolated node(s):** `Game UI Dashboard`, `PixiJS v7`, `README`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `UI & Dependencies`** (2 nodes): `Game UI Dashboard`, `PixiJS v7`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Documentation`** (1 nodes): `README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `gameLoop()` connect `Game Engine Core` to `Renderer`, `Buildings & Macro AI`, `Main Setup & UI Commands`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `GameEngine` connect `Game Engine Core` to `Buildings & Macro AI`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `Building` connect `Buildings & Macro AI` to `Specific Buildings`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `Game UI Dashboard`, `PixiJS v7`, `README` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._