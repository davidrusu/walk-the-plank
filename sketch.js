// SPRITESHEETS
// https://code-dot-org.github.io/p5.play/docs/classes/SpriteSheet.html

const add = p5.Vector.add;
const sub = p5.Vector.sub;
const mult = p5.Vector.mult;
const div = p5.Vector.div;

const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Constraint = Matter.Constraint;

// matter objects
let engine;
let chainConstraint;
let personBody;
let rockBody;

const AIR = 0.9;
const CHAIN_LENGTH = 150;
const GRAVITY = 0.4;
const MAX_ENERGY = 2000;
const PERSON_HEIGHT = 24 * 3; // multiples of 24
const PERSON_WIDTH = 16 * 3; // multiples of 16
const TARGET_NUM_BUBBLES = 100;

let anchorPointDelta;
let ball;
let bubbles = [];
let canvas;
let outOfEnergyTime = -100000;
let person;
let swimming = false;

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

  canvas = createCanvas(windowWidth, windowHeight);

  /////////// matter code ///////////
  engine = Engine.create()

  personBody = Bodies.rectangle(windowWidth/2, 100, PERSON_WIDTH, PERSON_HEIGHT, {inertia:Infinity})
  rockBody = Bodies.polygon(windowWidth/2, 250, 1, 15)
  chainConstraint = Constraint.create({
    bodyA: personBody,
    pointA: { x: 0, y: PERSON_HEIGHT/2 },
    bodyB: rockBody,
    pointB: { x: 0, y: 0 },
    stiffness: 0.01
  });

  World.add(engine.world, [personBody, rockBody, chainConstraint])

  const mouse = Mouse.create(canvas.elt);
  const mouseParams = {
    mouse: mouse,
    constraint: { stiffness: 0.05 }
  }
  mouseConstraint = MouseConstraint.create(engine, mouseParams);
  mouseConstraint.mouse.pixelRatio = pixelDensity();
  World.add(engine.world, mouseConstraint);

  Engine.run(engine);
  ///////////////////////////////////

  ball = {
    pos: createVector(windowWidth / 2, windowHeight / 2),
    velocity: createVector(0, 0),
  };
  anchorPointDelta = createVector(PERSON_WIDTH / 2, PERSON_HEIGHT);
  person = {
    pos: add(ball.pos, anchorPointDelta),
    velocity: createVector(0, 0),
    energy: MAX_ENERGY,
  };
  for (var i = 0; i < TARGET_NUM_BUBBLES; i++) {
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
  desiredBallPos = add(ball.pos, mult(ball.velocity, deltaTime));
  dir = sub(desiredBallPos, anchor.pos);
  if (dir.mag() > CHAIN_LENGTH) {
    // pull pirate in direction of chain
    ball.pos = add(anchor.pos, mult(dir.normalize(), CHAIN_LENGTH));
    person.velocity.add(mult(dir, 0.05));
  } else {
    ball.pos = desiredBallPos;
  }
  ball.velocity = mult(sub(ball.pos, oldPosition), 1.0 / clampedDt);
  ball.velocity.mult(AIR);
  ball.velocity.add(0, GRAVITY / clampedDt);
}

function updatePerson() {
  let clampedDt = max(deltaTime, 1.0);
  let mouse = createVector(mouseX, mouseY);
  let dir = sub(mouse, person.pos).normalize();
  dir.mult(0.03);
  person.velocity.add(dir);
  ball.velocity.add(0, GRAVITY / clampedDt);
  swimUp(mouseIsPressed);
  person.velocity.mult(lerp(AIR, 1, 0.8));
  person.pos.add(mult(person.velocity, deltaTime));
}

function swimUp(m) {
  pauseIsOver = millis() - outOfEnergyTime > 1000;
  if (m && person.energy > 0 && pauseIsOver) {
    person.velocity.add(createVector(0, -0.05));
    person.energy = max(person.energy - deltaTime, 0);
    swimming = true;
    if (person.energy == 0) {
      outOfEnergyTime = millis();
    }
  } else {
    swimming = false;
    if (pauseIsOver) {
      person.energy = min(person.energy + deltaTime * 0.3, MAX_ENERGY);
    }
  }
  rect(0, windowHeight - 50, (windowWidth * person.energy) / MAX_ENERGY, 20);
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
    let pos = add(person.pos, createVector(PERSON_WIDTH / 2, 10));
    bubbles.push({
      pos: pos,
      velocity: mult(
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
    bubble.pos.add(mult(bubble.velocity, deltaTime));
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
      let pos1 = add(bubble.pos, offset);
      let r1 = random(0, bubble.radius);
      bubbles.push({
        pos: pos1,
        velocity: add(
          bubble.velocity,
          mult(
            createVector(
              noise(pos1.x * noiseScale, noiseTime) - 0.5,
              noise(pos1.y * noiseScale, noiseTime) - 0.5
            ),
            0.5
          )
        ),
        radius: r1,
      });
      let pos2 = sub(bubble.pos, offset);
      bubbles.push({
        pos: pos2,
        velocity: add(
          bubble.velocity,
          mult(
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
  let pirateLegs = add(person.pos, anchorPointDelta);
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
    person.pos.x,
    person.pos.y,
    PERSON_WIDTH,
    PERSON_HEIGHT
  );
  stroke(60);
  strokeWeight(4);
  noFill();
  let abovePerson = add(person.pos, createVector(0, -CHAIN_LENGTH));
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

  // draw matter stuff
  stroke(255);
  fill(255);
  drawVertices(personBody.vertices)
  drawVertices(rockBody.vertices)
  stroke(128);
  strokeWeight(2);
  drawConstraint(chainConstraint)
}

function drawConstraint(constraint) {
  const offsetA = constraint.pointA;
  let posA = {x:0, y:0};
  if (constraint.bodyA) {
    posA = constraint.bodyA.position;
  }
  const offsetB = constraint.pointB;
  let posB = {x:0, y:0};
  if (constraint.bodyB) {
    posB = constraint.bodyB.position;
  }
  line(
    posA.x + offsetA.x,
    posA.y + offsetA.y,
    posB.x + offsetB.x,
    posB.y + offsetB.y
  );
}

function drawVertices(vertices) {
  beginShape();
  for (let i = 0; i < vertices.length; i++) {
    vertex(vertices[i].x, vertices[i].y);
  }
  endShape(CLOSE);
}
