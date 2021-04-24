let libs = ["https://cdn.jsdelivr.net/npm/p5.collide2d"];
// SPRITESHEETS
// https://code-dot-org.github.io/p5.play/docs/classes/SpriteSheet.html
let ball;
let chainLength = 150;
let PERSON_WIDTH = 30;
let PERSON_HEIGHT = 70;
let MAX_ENERGY = 2000
let ANCHOR_POINT_DELTA;
let PERSON;
let AIR = 0.9;
let GRAVITY = 0.4;
let addo = p5.Vector.add;
let subo = p5.Vector.sub;
let multo = p5.Vector.mult;
let divo = p5.Vector.div;
function setup() {
  createCanvas(windowWidth, windowHeight);
  ball = {
    pos: createVector(windowWidth / 2, windowHeight / 2),
    velocity: createVector(0, 0),
  };
  ANCHOR_POINT_DELTA = createVector(PERSON_WIDTH / 2, PERSON_HEIGHT);
  PERSON = {
    pos: addo(ball.pos, ANCHOR_POINT_DELTA),
    velocity: createVector(0, 0),
    energy: MAX_ENERGY
  };
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
  let dir = subo(mouse, PERSON.pos);
  dir.mult(0.0001);
  PERSON.velocity.add(dir);
  ball.velocity.add(0, GRAVITY / clampedDt);
  swimUp(mouseIsPressed)
  PERSON.velocity.mult(lerp(AIR, 1, 0.8));
  PERSON.pos.add(multo(PERSON.velocity, deltaTime));
}

function swimUp(m) {
  if (m && PERSON.energy > 0) {
    PERSON.velocity.add(createVector(0, -0.05));
    PERSON.energy = max(PERSON.energy - deltaTime, 0);
  } else {
    PERSON.energy = min(PERSON.energy + deltaTime * 0.3, MAX_ENERGY);
  }
  rect(0,windowHeight-50,windowWidth*PERSON.energy/MAX_ENERGY,20)
}

let bubbles = [];
function updateBubbleSystem() {
  let targetNumBubbles = 100;
  if (bubbles.length < targetNumBubbles && random() < 0.1) {
    bubbles.push({
      pos: createVector(random(0, windowWidth), windowHeight),
      velocity: createVector(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }
  let toRemove = [];
  for (var i = 0; i < bubbles.length; i++) {
    let bubble = bubbles[i];
    fill(255, 255, 255, noise(i) * 255);
    stroke(255);
    circle(bubble.pos.x, bubble.pos.y, bubble.radius);
    bubble.pos.add(multo(bubble.velocity, deltaTime));
    let randomness = createVector(
      noise(bubble.pos.x) - 0.5,
      noise(bubble.pos.y) - 0.5
    );
    randomness.mult(0.01);
    bubble.velocity.add(randomness);
    if (bubble.pos.y < 0) {
      toRemove.push(i);
    }
  }
  toRemove.reverse();
  for (var i of toRemove) {
    bubbles.splice(i, 1);
  }
}
function draw() {
  background(10, 30, 50);
  let mouse = createVector(mouseX, mouseY);
  let pirateLegs = addo(PERSON.pos, ANCHOR_POINT_DELTA);
  updateBallPos({ pos: pirateLegs });
  updatePerson();
  updateBubbleSystem();
  fill(255);
  rect(PERSON.pos.x, PERSON.pos.y, PERSON_WIDTH, PERSON_HEIGHT, 10, 10, 10, 10);
  line(ball.pos.x, ball.pos.y, pirateLegs.x, pirateLegs.y);
  fill(0);
  ellipse(ball.pos.x, ball.pos.y, 50, 50);
}
