import { filterDashboardNavForRoles } from "../src/lib/navigation/filter-dashboard-nav";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const hrefs = (roles: Parameters<typeof filterDashboardNavForRoles>[0]) =>
  filterDashboardNavForRoles(roles)
    .map((i) => i.href)
    .sort();

const owner = hrefs(["owner"]);
assert(owner.includes("/dashboard"), "owner: dashboard");
assert(owner.includes("/ai"), "owner: AI hub");
assert(!owner.includes("/ai/manager"), "owner: no AI manager sidebar");
assert(!owner.includes("/ai/tasks"), "owner: no AI tasks sidebar");
assert(owner.includes("/members"), "owner: roles");
assert(owner.includes("/settings"), "owner: settings");
assert(!owner.includes("/profile"), "owner: no profile sidebar");
assert(owner.includes("/players"), "owner: kadra");

const president = hrefs(["president"]);
assert(president.includes("/finance"), "president: finance");
assert(president.includes("/integrations"), "president: integrations");

const coach = hrefs(["coach"]);
assert(coach.includes("/training/coach"), "coach: panel trenera");
assert(coach.includes("/matches"), "coach: matches");
assert(coach.includes("/ai"), "coach: AI");
assert(!coach.includes("/finance"), "coach: no finance");

const parent = hrefs(["parent"]);
assert(parent.includes("/finance/portal"), "parent: składki");
assert(parent.includes("/attendance"), "parent: attendance");
assert(!parent.includes("/members"), "parent: no roles");

const player = hrefs(["player"]);
assert(player.includes("/inventory/portal"), "player: magazyn portal");
assert(!player.includes("/inventory"), "player: no staff inventory");

const sponsor = hrefs(["sponsor"]);
assert(sponsor.includes("/sponsors/portal"), "sponsor: portal");
assert(sponsor.includes("/content"), "sponsor: content");
assert(!sponsor.includes("/sponsors"), "sponsor: no staff sponsors");

console.log("OK RBAC visibility (owner, president, coach, parent, player, sponsor)");
