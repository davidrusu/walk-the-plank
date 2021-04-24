let libs = ["https://cdn.jsdelivr.net/npm/p5.collide2d"];
// SPRITESHEETS
// https://code-dot-org.github.io/p5.play/docs/classes/SpriteSheet.html
let ball;
let chainLength = 150;
let targetNumBubbles = 100;
let bubbles = [];
let outOfEnergyTime = -100000;
let MAX_ENERGY = 2000;
let PERSON_WIDTH = 16 * 3; // multiples of 16
let PERSON_HEIGHT = 24 * 3; // multiples of 24
let ANCHOR_POINT_DELTA;
let PERSON;
let AIR = 0.9;
let GRAVITY = 0.4;
let swimming = false;
let addo = p5.Vector.add;
let subo = p5.Vector.sub;
let multo = p5.Vector.mult;
let divo = p5.Vector.div;

let pirateIdleSpriteSheet;
let pirateSwimSpriteSheets;
let rockSpriteSheet;

function preload() {
  pirateIdleSpriteSheet = loadSpriteSheet(
    "assets/pirate_idle_spritesheet.png",
    16,
    24,
    8
  );

  pirateSwimSpriteSheets = [
    loadSpriteSheet("assets/pirate_swim_1_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_swim_2_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_swim_3_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_swim_4_spritesheet.png", 16, 24, 8),
  ];

  rockSpriteSheet = loadSpriteSheet(
    "assets/rock_spritesheet.png",
    128,
    128,
    64
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  matter.init();
  ball = {
    pos: createVector(windowWidth / 2, windowHeight / 2),
    velocity: createVector(0, 0),
  };
  ANCHOR_POINT_DELTA = createVector(PERSON_WIDTH / 2, PERSON_HEIGHT);
  PERSON = {
    pos: addo(ball.pos, ANCHOR_POINT_DELTA),
    velocity: createVector(0, 0),
    energy: MAX_ENERGY,
  };
  for (var i = 0; i < targetNumBubbles; i++) {
    bubbles.push({
      pos: createVector(random(0, windowWidth), random(0, windowHeight)),
      velocity: createVector(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function updateBallPos(anchor) {
  let clampedDt = max(deltaTime, 1.0);
  oldPosition = ball.pos;
  desiredBallPos = addo(ball.pos, multo(ball.velocity, deltaTime));
  dir = subo(desiredBallPos, anchor.pos);
  if (dir.mag() > chainLength) {
    // pull pirate in direction of chain
    ball.pos = addo(anchor.pos, multo(dir.normalize(), chainLength));
    PERSON.velocity.add(multo(dir, 0.05));
  } else {
    ball.pos = desiredBallPos;
  }
  ball.velocity = multo(subo(ball.pos, oldPosition), 1.0 / clampedDt);
  ball.velocity.mult(AIR);
  ball.velocity.add(0, GRAVITY / clampedDt);
}

function updatePerson() {
  let clampedDt = max(deltaTime, 1.0);
  let mouse = createVector(mouseX, mouseY);
  let dir = subo(mouse, PERSON.pos).normalize();
  dir.mult(0.03);
  PERSON.velocity.add(dir);
  ball.velocity.add(0, GRAVITY / clampedDt);
  swimUp(mouseIsPressed);
  PERSON.velocity.mult(lerp(AIR, 1, 0.8));
  PERSON.pos.add(multo(PERSON.velocity, deltaTime));
}

function swimUp(m) {
  pauseIsOver = millis() - outOfEnergyTime > 1000;
  if (m && PERSON.energy > 0 && pauseIsOver) {
    PERSON.velocity.add(createVector(0, -0.05));
    PERSON.energy = max(PERSON.energy - deltaTime, 0);
    swimming = true;
    if (PERSON.energy == 0) {
      outOfEnergyTime = millis();
    }
  } else {
    swimming = false;
    if (pauseIsOver) {
      PERSON.energy = min(PERSON.energy + deltaTime * 0.3, MAX_ENERGY);
    }
  }
  rect(0, windowHeight - 50, (windowWidth * PERSON.energy) / MAX_ENERGY, 20);
}

function updateBubbleSystem() {
  if (random() < 0.05) {
    bubbles.push({
      pos: createVector(random(0, windowWidth), windowHeight),
      velocity: createVector(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }

  let noiseTime = millis() * 0.0001;
  let noiseScale = 0.1;
  if (random() < (swimming ? 0.5 : 0.1)) {
    let pos = addo(PERSON.pos, createVector(PERSON_WIDTH / 2, 10));
    bubbles.push({
      pos: pos,
      velocity: multo(
        createVector(
          noise(pos.x * noiseScale, noiseTime) - 0.5,
          noise(pos.y * noiseScale, noiseTime) - 0.5
        ),
        0.5
      ),
      radius: random(1, 15),
    });
  }

  let toRemove = [];
  for (var i = 0; i < bubbles.length; i++) {
    let bubble = bubbles[i];
    fill(255, 50);
    stroke(255, 80);
    circle(bubble.pos.x, bubble.pos.y, bubble.radius);
    bubble.pos.add(multo(bubble.velocity, deltaTime));
    let randomness = createVector(
      noise(bubble.pos.x * noiseScale, noiseTime) - 0.5,
      noise(bubble.pos.y * noiseScale, noiseTime) - 0.5
    );
    randomness.mult(0.01);
    bubble.velocity.add(randomness);
    bubble.velocity.add(0, -0.005);
    bubble.velocity.y *= lerp(AIR, 1, 0.8);
    if (bubble.pos.y < 0) {
      toRemove.push(i);
    } else if (random() < 0.001 * bubble.radius && bubble.radius > 5) {
      toRemove.push(i);
      let offsetR = 3;
      let offset = createVector(
        random(-offsetR, offsetR),
        random(-offsetR, offsetR)
      );
      let pos1 = addo(bubble.pos, offset);
      let r1 = random(0, bubble.radius);
      bubbles.push({
        pos: pos1,
        velocity: addo(
          bubble.velocity,
          multo(
            createVector(
              noise(pos1.x * noiseScale, noiseTime) - 0.5,
              noise(pos1.y * noiseScale, noiseTime) - 0.5
            ),
            0.5
          )
        ),
        radius: r1,
      });
      let pos2 = subo(bubble.pos, offset);
      bubbles.push({
        pos: pos2,
        velocity: addo(
          bubble.velocity,
          multo(
            createVector(
              noise(pos2.x * noiseScale, noiseTime) - 0.5,
              noise(pos2.y * noiseScale, noiseTime) - 0.5
            ),
            -0.5
          )
        ),
        radius: r1,
      });
    }
  }

  toRemove.reverse();
  for (var i of toRemove) {
    bubbles.splice(i, 1);
  }
}

let rockFrame = 0;
let pirateSwimFrame = 0;
function draw() {
  background(10, 30, 50);
  let mouse = createVector(mouseX, mouseY);
  let pirateLegs = addo(PERSON.pos, ANCHOR_POINT_DELTA);
  updateBallPos({ pos: pirateLegs });
  updatePerson();
  updateBubbleSystem();
  fill(255);

  let pirateFrame = floor((mouseX / windowWidth) * 8);
  let pirateSpriteSheet = pirateIdleSpriteSheet;
  if (swimming) {
    if (frameCount % 10 == 0) {
      pirateSwimFrame = (pirateSwimFrame + 1) % pirateSwimSpriteSheets.length;
    }
    pirateSpriteSheet = pirateSwimSpriteSheets[pirateSwimFrame];
  }
  pirateSpriteSheet.drawFrame(
    pirateFrame,
    PERSON.pos.x,
    PERSON.pos.y,
    PERSON_WIDTH,
    PERSON_HEIGHT
  );
  stroke(60);
  strokeWeight(4);
  noFill();
  let abovePerson = addo(PERSON.pos, createVector(0, -chainLength));
  curve(
    ball.pos.x,
    ball.pos.y,
    ball.pos.x,
    ball.pos.y,
    pirateLegs.x,
    pirateLegs.y,
    abovePerson.x,
    abovePerson.y
  );
  fill(0);
  rockSpriteSheet.drawFrame(
    rockFrame,
    ball.pos.x - 25,
    ball.pos.y - 25,
    50,
    50
  );
  if (frameCount % 5 == 0) {
    rockFrame = (rockFrame + 1) % 8;
  }
}
