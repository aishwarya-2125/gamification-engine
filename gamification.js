// gamification.js
module.exports = function initGamification(db) {
  const XP_PER_STAR = 10;       // XP gained per star
  const XP_PER_LEVEL = 10;      // 10 XP = 1 farm level

  const run = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      })
    );

  const get = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
    );

  const all = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );

  async function ensureSchemas() {
    await run(`CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      xp INTEGER DEFAULT 0,
      stars_total INTEGER DEFAULT 0,
      farm_level INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      title TEXT,
      description TEXT,
      min_level INTEGER DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      badge_id INTEGER,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS client_actions (
      client_id TEXT PRIMARY KEY,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed badges
    const badgeList = [
      ["seedling", "Seedling", "Reach level 2", 2],
      ["sprout", "Sprout", "Reach level 4", 4],
      ["sapling", "Sapling", "Reach level 6", 6],
      ["tree", "Tree", "Reach level 8", 8],
      ["giant_tree", "Giant Tree", "Reach level 10", 10],
    ];

    for (const [key, title, desc, min_level] of badgeList) {
      await run(
        INSERT OR IGNORE INTO badges (key, title, description, min_level) VALUES (?,?,?,?),
        [key, title, desc, min_level]
      );
    }
  }

  async function getUserState(user_id) {
    const stats =
      (await get(SELECT xp, stars_total, farm_level FROM user_stats WHERE user_id = ?, [user_id])) ||
      { xp: 0, stars_total: 0, farm_level: 0 };

    const badges = await all(
      `SELECT b.* FROM badges b
       JOIN user_badges ub ON b.id = ub.badge_id
       WHERE ub.user_id = ?`,
      [user_id]
    );

    return { ...stats, badges };
  }

  async function awardProgress({ user_id, stars = 0, quest_id = null, client_id = null, answer = null }) {
    if (!user_id) throw new Error("user_id required");

    if (client_id) {
      const exists = await get(SELECT client_id FROM client_actions WHERE client_id = ?, [client_id]);
      if (exists) return { status: "duplicate", client_id };
    }

    // Ensure user stats exist
    await run(INSERT OR IGNORE INTO user_stats (user_id, xp, stars_total, farm_level) VALUES (?,0,0,0), [user_id]);

    // Update XP and stars
    const xp_gain = stars * XP_PER_STAR;
    await run(UPDATE user_stats SET xp = xp + ?, stars_total = stars_total + ? WHERE user_id = ?, [xp_gain, stars, user_id]);

    // Fetch updated stats
    let stats = await get(SELECT xp, stars_total, farm_level FROM user_stats WHERE user_id = ?, [user_id]);

    // Compute new farm level
    const newFarmLevel = Math.floor(stats.xp / XP_PER_LEVEL);
    let leveledUp = false;
    let earnedBadge = null;

    if (newFarmLevel > stats.farm_level) {
      await run(UPDATE user_stats SET farm_level = ? WHERE user_id = ?, [newFarmLevel, user_id]);
      stats.farm_level = newFarmLevel;
      leveledUp = true;

      // Award all badges for levels <= newFarmLevel
      const badgesToAward = await all(
        SELECT * FROM badges WHERE min_level <= ? ORDER BY min_level ASC,
        [newFarmLevel]
      );

      for (const badge of badgesToAward) {
        const already = await get(
          SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?,
          [user_id, badge.id]
        );
        if (!already) {
          await run(INSERT INTO user_badges (user_id, badge_id) VALUES (?,?), [user_id, badge.id]);
          earnedBadge = badge; // For frontend notification
        }
      }
    }

    // Record client action
    if (client_id) {
      await run(INSERT INTO client_actions (client_id, user_id) VALUES (?,?), [client_id, user_id]);
    }

    const finalState = await getUserState(user_id);
    return { ...finalState, leveledUp, earnedBadge };
  }

  return { ensureSchemas, awardProgress, getUserState };
};
