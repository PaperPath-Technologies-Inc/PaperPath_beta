export type ReviewRiskAction = {
  title: string;
  cta_route: string;
};

export type ReviewTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: "todo" | "done";
};

export type ReviewDeadline = {
  id: string;
  title: string;
  due_at: string;
  is_done: boolean;
};

export type WeeklyReviewItem = {
  id: string;
  type: "task" | "deadline";
  title: string;
  dueAt: string;
  daysDelta: number;
  editRoute: string;
};

export type BestAction = {
  title: string;
  description: string;
  route: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function diffDays(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function buildWeeklyItems(input: {
  tasks: ReviewTask[];
  deadlines: ReviewDeadline[];
  today?: Date;
  windowDays?: number;
}) {
  const today = startOfDay(input.today ?? new Date());
  const windowDays = input.windowDays ?? 7;

  const tasks = input.tasks
    .filter((task) => task.status === "todo" && Boolean(task.due_date))
    .map((task) => {
      const dueAt = `${task.due_date}T12:00:00.000Z`;
      return {
        id: task.id,
        type: "task" as const,
        title: task.title,
        dueAt,
        daysDelta: diffDays(today, new Date(dueAt)),
        editRoute: "/tasks?category=pgwp",
      };
    });

  const deadlines = input.deadlines
    .filter((item) => !item.is_done)
    .map((item) => ({
      id: item.id,
      type: "deadline" as const,
      title: item.title,
      dueAt: item.due_at,
      daysDelta: diffDays(today, new Date(item.due_at)),
      editRoute: `/reminders/${item.id}/edit`,
    }));

  const all = [...tasks, ...deadlines].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const upcoming = all.filter((item) => item.daysDelta >= 0 && item.daysDelta <= windowDays);
  const overdue = all.filter((item) => item.daysDelta < 0);

  return {
    upcomingTasks: tasks.filter((item) => item.daysDelta >= 0 && item.daysDelta <= windowDays).slice(0, 5),
    upcomingDeadlines: deadlines.filter((item) => item.daysDelta >= 0 && item.daysDelta <= windowDays).slice(0, 5),
    overdueTasks: tasks.filter((item) => item.daysDelta < 0).slice(0, 5),
    overdueDeadlines: deadlines.filter((item) => item.daysDelta < 0).slice(0, 5),
    upcoming,
    overdue,
  };
}

export function pickWeeklyBestAction(input: {
  riskAction?: ReviewRiskAction | null;
  overdue: WeeklyReviewItem[];
  upcoming: WeeklyReviewItem[];
}): BestAction {
  if (input.riskAction?.cta_route) {
    return {
      title: input.riskAction.title,
      description: "Suggested from your current PGWP risk summary.",
      route: input.riskAction.cta_route,
    };
  }

  const firstOverdue = input.overdue[0];
  if (firstOverdue) {
    return {
      title: `Resolve overdue: ${firstOverdue.title}`,
      description: "Handle this overdue item first.",
      route: firstOverdue.editRoute,
    };
  }

  const firstUpcoming = input.upcoming[0];
  if (firstUpcoming) {
    return {
      title: `Prepare: ${firstUpcoming.title}`,
      description: "Knock this out early this week.",
      route: firstUpcoming.editRoute,
    };
  }

  return {
    title: "Add a new PGWP task",
    description: "Start with one concrete task for this week.",
    route: "/tasks/new?category=pgwp",
  };
}

export function getWeekStartDate(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const daysFromMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - daysFromMonday);
  return copy.toISOString().slice(0, 10);
}

