# Daily Tracker – UML

Diagrams are written in [Mermaid](https://mermaid.js.org/). GitHub renders them
automatically when you open this file on github.com, and VS Code shows them with
the "Markdown Preview Mermaid Support" extension (Ctrl+Shift+V to preview).

Add new diagrams as new sections below. Each one goes inside a ```mermaid block.

---

## 1. Data model (ER)

`project_id` on a task is optional: empty means "standalone task".
Deleting a project keeps its tasks and just empties their `project_id`.
Status values marked *planned* are not in the database yet.

```mermaid
erDiagram
    USER ||--o{ HABIT : owns
    USER ||--o{ TASK : owns
    USER ||--o{ PROJECT : owns
    HABIT ||--o{ LOG : "one row per day"
    PROJECT |o--o{ TASK : "groups (optional)"

    HABIT {
        bigint id PK
        uuid user_id
        text title
        int target_seconds
        bool active
    }
    LOG {
        uuid user_id
        bigint habit_id FK
        date date
        int seconds_done
        bigint started_at
    }
    TASK {
        bigint id PK
        uuid user_id
        text text
        bool done
        timestamptz created_at
        bigint project_id FK "planned, nullable"
    }
    PROJECT {
        bigint id PK
        uuid user_id
        text name "planned"
        text status "planned: active or done"
        timestamptz created_at "planned"
    }
```

---

## 2. The three tabs (flow)

```mermaid
flowchart TB
    subgraph H[Habits tab - every day]
        H1[Add habit: title + minutes] --> H2[Habit card]
        H2 -->|Start / Pause| H3[Timer runs from startedAt]
        H3 -->|target reached| H4[Auto stop + notify]
        H4 --> H5[Today's log row]
        H5 --> H6[History + streak]
    end

    subgraph T[Tasks tab - one-off]
        T1[Add task + optional project] --> T2[Task list]
        T2 -->|filter| T3[All / No project / one project]
        T2 -->|tick| T4[done = true]
        T2 -->|✕| T5[Delete task]
    end

    subgraph P[Projects tab - groups of tasks]
        P1[Create project: name] --> P2[Project card with progress x / y]
        P2 -->|open| P3[Project detail]
        P3 -->|add task| T1
        P3 -->|tick task| T4
        P3 -->|all done| P4[Mark project done]
        P2 -->|delete| P5[Confirm: tasks stay, project_id emptied]
    end

    T4 -.->|progress recalculated| P2
```

---

## 3. Data flow (sequence)

How a change travels from a click to Supabase.

```mermaid
sequenceDiagram
    actor User
    participant UI as app.js (render)
    participant Sync as sync.js
    participant DB as Supabase

    User->>UI: click (start timer, add task, ...)
    UI->>UI: change data
    UI->>Sync: saveData(data)
    UI->>UI: render()
    Note over Sync: waits ~300 ms (debounce)
    Sync->>DB: deletes, then upserts in order: projects, habits, tasks, logs
    DB-->>Sync: ok / error
    Sync-->>UI: update syncStatus
```

---

## 4. Login flow (sequence)

```mermaid
sequenceDiagram
    actor User
    participant Auth as auth.js
    participant SB as Supabase Auth
    participant App as app.js

    User->>Auth: email + password, click loginBtn
    Auth->>SB: signInWithPassword()
    SB-->>Auth: session
    Auth->>App: startApp()
    App->>SB: load projects, tasks, habits, logs
    App-->>User: show appView
    User->>Auth: click logoutBtn
    Auth->>App: stopApp()
    Auth-->>User: show authView
```

---

## 5. Script load order (dependencies)

Scripts are plain `<script>` tags, so each file can only use what was loaded above it.
`projects.js` is planned.

```mermaid
flowchart LR
    cdn[supabase CDN] --> config[config.js] --> storage[storage.js] --> habits[habits.js]
    habits --> projects[projects.js - planned] --> timer[timer.js] --> notify[notify.js]
    notify --> history[history.js] --> sync[sync.js] --> app[app.js] --> nav[nav.js] --> auth[auth.js]
```
