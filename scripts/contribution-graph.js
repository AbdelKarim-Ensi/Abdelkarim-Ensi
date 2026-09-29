const fs = require("fs");

const USER = process.env.GH_USER || "AbdelKarim-Ensi";
const TOKEN = process.env.GH_TOKEN;

const query = `query($login:String!){
  user(login:$login){
    contributionsCollection{
      contributionCalendar{
        totalContributions
        weeks{ firstDay contributionDays{ date contributionCount contributionLevel weekday } }
      }
    }
  }
}`;

const COLORS = {
  NONE: "#161b22",
  FIRST_QUARTER: "#0e4429",
  SECOND_QUARTER: "#006d32",
  THIRD_QUARTER: "#26a641",
  FOURTH_QUARTER: "#39d353",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

(async () => {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));

  const cal = json.data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks;

  const CELL = 10, STEP = 13;
  const X0 = 46, Y0 = 80;
  const W = X0 + weeks.length * STEP + 16;
  const H = 225;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`;
  svg += `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="#0d1117" stroke="#30363d"/>`;
  svg += `<text x="16" y="36" font-size="20" fill="#e6edf3">${cal.totalContributions} contributions in the last year</text>`;

  // Month labels
  const labels = [];
  let prev = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w.firstDay).getUTCMonth();
    if (m !== prev) { labels.push({ i, m }); prev = m; }
  });
  if (labels.length > 1 && labels[1].i - labels[0].i < 3) labels.shift();
  labels.forEach(({ i, m }) => {
    svg += `<text x="${X0 + i * STEP}" y="${Y0 - 10}" font-size="12" fill="#e6edf3">${MONTHS[m]}</text>`;
  });

  // Day labels
  [["Mon", 1], ["Wed", 3], ["Fri", 5]].forEach(([t, r]) => {
    svg += `<text x="12" y="${Y0 + r * STEP + 9}" font-size="12" fill="#e6edf3">${t}</text>`;
  });

  // Cells
  weeks.forEach((w, i) => {
    w.contributionDays.forEach((d) => {
      svg += `<rect x="${X0 + i * STEP}" y="${Y0 + d.weekday * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS[d.contributionLevel]}"><title>${d.contributionCount} contributions on ${d.date}</title></rect>`;
    });
  });

  // Legend
  const LY = Y0 + 7 * STEP + 34;
  const squaresEnd = W - 16 - 38;
  const squaresStart = squaresEnd - 5 * STEP;
  svg += `<text x="${W - 16}" y="${LY + 9}" font-size="12" fill="#7d8590" text-anchor="end">More</text>`;
  svg += `<text x="${squaresStart - 6}" y="${LY + 9}" font-size="12" fill="#7d8590" text-anchor="end">Less</text>`;
  Object.values(COLORS).forEach((c, k) => {
    svg += `<rect x="${squaresStart + k * STEP}" y="${LY}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`;
  });
  svg += `<text x="16" y="${LY + 9}" font-size="12" fill="#7d8590">Learn how we count contributions</text>`;

  svg += `</svg>`;

  fs.mkdirSync("assets", { recursive: true });
  fs.writeFileSync("assets/contribution-graph.svg", svg);
  console.log("Generated assets/contribution-graph.svg");
})();
