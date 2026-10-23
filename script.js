// HTMLをはじけさせよう！
const PANEL_HEIGHT = 150;    // 下のパネルの高さ(px)
const GRAVITY      = 1400;   // 水の重力(px/秒²)
const MAX_SPEED    = 1500;   // これを超えるとページが飛ぶ(度/秒 = 250rpm)
const SPIN_POWER   = 900;    // 水圧が回転を加速させる強さ
const SPIN_DRAG    = 0.5;    // 回転が自然に弱まる割合
const FLY_DURATION = 2.6;    // 飛んでいく時間(秒)

const page      = document.getElementById("page");
const message   = document.getElementById("message");
const button    = document.getElementById("button");
const rpmText   = document.getElementById("rpmText");
const powerText = document.getElementById("powerText");
const waterEl   = document.getElementById("water-level");

//状態
let holding = false;      // ボタンを押しているか
let power   = 0;          // 水圧 0〜1
let speed   = 0;          // 回転速度(度/秒)
let angle   = 0;          // 現在の回転角(度)
let flying  = false;      // 飛んでいる最中か
let flyTime = 0;          // 飛び始めてからの経過秒
let fly     = null;       // 飛行中の位置と速度
let drops   = [];         // 水滴の配列
let nozzleY;              // 噴水の出口のY座標
let waterLevel = 0;       // 貯水量

// ===== 操作 =====
function press(on) { holding = on; }
button.addEventListener("pointerdown", (e) => { e.preventDefault(); press(true); });
window.addEventListener("pointerup", () => press(false));
window.addEventListener("keydown", (e) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(true); } });
window.addEventListener("keyup",   (e) => { if (e.code === "Space") press(false); });

document.getElementById("reset").addEventListener("click", () => {
  flying = false;
  speed = 0;
  angle = 0;
  waterLevel = 0;
  message.hidden = true;
  page.hidden = false;
});




// ===== p5.js: 最初に1回だけ呼ばれる =====
function setup() {
  createCanvas(windowWidth, windowHeight).parent("sketch");
  noStroke();
  nozzleY = height - PANEL_HEIGHT;   // 噴水の出口(パネルの上端)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  nozzleY = height - PANEL_HEIGHT;
}

// ===== p5.js: 毎フレーム呼ばれる =====
function draw() {
  const dt = min(0.05, deltaTime / 1000);   // 前フレームからの経過秒

  updatePower(dt);
  updatePage(dt);
  updateDrops(dt);

  clear();
  // 貯水量は背景の div(#water-level)の高さで表す(ページより後ろに表示される)
  waterEl.style.height = waterLevel + "px";

  fill(43, 143, 214, 150);
  for (const d of drops) circle(d.pos.x, d.pos.y, 6);

  rpmText.textContent = round(speed / 6);   // 度/秒 → 回転/分
  powerText.textContent = round(power * 100);


}

// 水圧: 押している間は上がり、離すと下がる
function updatePower(dt) {
  power += ((holding ? 1 : 0) - power) * (1 - exp(-2 * dt));
}

// ページの回転・震え・飛行
function updatePage(dt) {
  // 回転: 水圧で加速し、少しずつ弱まる
  speed += (SPIN_POWER * pow(power, 1.5) - SPIN_DRAG * speed) * dt;
  angle += speed * dt;

  // 基本位置(水圧が高いほど水に押し上げられる)
  const center = createVector(width / 2, nozzleY * 0.5 - power * 100);

  if (!flying) {
    // 限界に近づくとぶるぶる震える
    const shake = max(0, speed / MAX_SPEED - 0.6) * 30;
    placePage(center.x + random(-shake, shake) / 2,
              center.y + random(-shake, shake) / 2, 1);

    if (speed > MAX_SPEED) startFlying(center);
  } else if (!page.hidden) {
    // 飛行中: だんだん加速して小さくなり、消える
    flyTime += dt;
    fly.vel.mult(1 + 0.9 * dt);
    fly.pos.add(p5.Vector.mult(fly.vel, dt));
    speed *= 1 + 0.4 * dt;
    const scale = pow(max(0, 1 - flyTime / FLY_DURATION), 2);
    placePage(center.x + fly.pos.x, center.y + fly.pos.y, scale);

    if (flyTime >= FLY_DURATION) {
      page.hidden = true;
      message.hidden = false;
      speed = 0;
    }
  }
}

// 発射: ランダムな横向きの勢いで上へ飛ばし、水しぶきを散らす
function startFlying(center) {
  flying = true;
  flyTime = 0;
  fly = {
    pos: createVector(0, 0),
    vel: createVector(random(-0.35, 0.35) * height, -0.55 * height),
  };
  for (let i = 0; i < 150; i++) {
    const v = p5.Vector.random2D().mult(random(150, 750));
    v.y -= 250;
    drops.push({ pos: center.copy(), vel: v });
  }
}

function placePage(x, y, scale) {
  page.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;
}

// ===== 水滴 =====
function updateDrops(dt) {
  // power:水圧が0.02以上であれば
  if (power > 0.02) {
    const count = (30 + 500 * power) * dt;
    const jetHeight = nozzleY * (0.15 + 0.95 * power);
    const jetSpeed = sqrt(2 * GRAVITY * jetHeight);   // その高さに届く初速
    for (let i = 0; i < count; i++) {
      drops.push({
        pos: createVector(width / 2, nozzleY),
        vel: createVector(random(-0.5, 0.5) * (50 + 150 * power), -jetSpeed * random(0.9, 1)),
      });
    }
  }

  // 重力で動かし、地面に落ちたものは消す 
  // 水滴を削除することで軽量化　しかし、積みあがる様子を表現したい.
  for (const d of drops) {
    d.vel.y += GRAVITY * dt;
    d.pos.add(p5.Vector.mult(d.vel, dt));

    // 地面に到達
    if (d.pos.y >= nozzleY && d.vel.y > 0) {
      waterLevel += 0.1;
      d.dead = true;
    }
  }
  
  drops = drops.filter(d => !d.dead);
  /*
  drops = drops.filter(
    (d) => d.pos.y < nozzleY || d.vel.y < 0
  );
  */
}



// スクロールバー(SimpleBar) #pageが対象.
const bar = new SimpleBar(page, { autoHide: false });
const scrollArea = bar.getScrollElement();   // 実際にスクロールする要素

// ヘッダーのリンクは、ページ内の位置までスクロールさせる
const HEADER_HEIGHT = 75;   // 固定ヘッダーの高さ(px)

document.querySelectorAll('#page a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute("href"));
    scrollArea.scrollTo({ top: Math.max(0, target.offsetTop - HEADER_HEIGHT), behavior: "smooth" });
  });
});
