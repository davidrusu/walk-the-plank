// SPRITESHEETS
// https://code-dot-org.github.io/p5.play/docs/classes/SpriteSheet.html

const add = p5.Vector.add;
const sub = p5.Vector.sub;
const mult = p5.Vector.mult;
const div = p5.Vector.div;

const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Constraint = Matter.Constraint;
const Engine = Matter.Engine;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Render = Matter.Render;
const World = Matter.World;
const Vector = Matter.Vector;

// matter objects
let engine;

const AIR = 0.9;
const CHAIN_LENGTH = 150;
const GRAVITY = 0.4;
const MAX_ENERGY = 1500;
const PERSON_HEIGHT = 24 * 1.5; // multiples of 24
const PERSON_WIDTH = 16 * 1.5; // multiples of 16
const ROCK_RADIUS = 15;
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
  pirateIdleSpriteSheets = [
    loadSpriteSheet("assets/pirate_idle_1_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_idle_2_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_idle_3_spritesheet.png", 16, 24, 8),
    loadSpriteSheet("assets/pirate_idle_4_spritesheet.png", 16, 24, 8),
  ];

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
  engine = Engine.create();
  engine.gravity.y = 0.05;

  const mouse = Mouse.create(canvas.elt);
  const mouseParams = {
    mouse: mouse,
    constraint: { stiffness: 0.05 },
  };
  mouseConstraint = MouseConstraint.create(engine, mouseParams);
  mouseConstraint.mouse.pixelRatio = pixelDensity();
  World.add(engine.world, mouseConstraint);

  spawnPirate(windowWidth / 2, 100);

  for (var i = 0; i < 10; i++) {
    spawnJelly(random(windowWidth), random(windowHeight));
  }
  Engine.run(engine);
  ///////////////////////////////////

  ball = {
    pos: createVector(windowWidth / 2, windowHeight / 2),
    velocity: createVector(0, 0),
  };
  anchorPointDelta = createVector(PERSON_WIDTH / 2, PERSON_HEIGHT);
  person.pos = add(ball.pos, anchorPointDelta);
  person.velocity = createVector(0, 0);
  person.energy = MAX_ENERGY;

  for (var i = 0; i < TARGET_NUM_BUBBLES; i++) {
    bubbles.push({
      pos: createVector(random(0, windowWidth), random(0, windowHeight)),
      velocity: createVector(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }
}

function spawnPirate(x, y) {
  console.log("Spawning pirate");
  group = Body.nextGroup(true);
  person = {};
  person.body = Bodies.rectangle(x, y, PERSON_WIDTH, PERSON_HEIGHT, {
    inertia: Infinity,
    frictionAir: 0.03,
  });

  let chainLinkLength = 10;
  person.chain = Composites.stack(
    person.body.position.x,
    person.body.position.y + PERSON_HEIGHT / 2,
    8,
    1,
    0,
    0,
    function (x, y) {
      return Bodies.rectangle(x, y, chainLinkLength, 3, {
        collisionFilter: { group: group },
      });
    }
  );
  Composites.chain(person.chain, 0.5, 0, -0.5, 0, {
    stiffness: 1,
    length: 0,
  });
  Composite.add(
    person.chain,
    Constraint.create({
      bodyB: person.chain.bodies[0],
      pointB: { x: 0, y: 0 },
      bodyA: person.body,
      pointA: { x: 0, y: PERSON_HEIGHT / 2 },
      stiffness: 0.5,
    })
  );
  let lastChainBody = person.chain.bodies[person.chain.bodies.length - 1];
  person.rock = Bodies.circle(
    lastChainBody.position.x,
    lastChainBody.position.y,
    ROCK_RADIUS
  );

  World.add(engine.world, [
    person.body,
    person.rock,
    person.chain,
    Constraint.create({
      bodyA: lastChainBody,
      bodyB: person.rock,
      pointA: { x: chainLinkLength, y: 0 },
      pointB: { x: 0, y: chainLinkLength },
      stiffness: 0.5,
    }),
  ]);
}

let rockFrame = 0;
let pirateSwimFrame = 0;
let pirateIdleFrame = 0;
function drawPirate() {
  let pirateFrame = floor(min(mouseX / windowWidth, 1) * 7);
  if (frameCount % 10 == 0) {
    pirateSwimFrame = (pirateSwimFrame + 1) % pirateSwimSpriteSheets.length;
    pirateIdleFrame = (pirateIdleFrame + 1) % pirateIdleSpriteSheets.length;
  }
  let pirateSpriteSheet = pirateIdleSpriteSheets[pirateIdleFrame];
  if (swimming) {
    pirateSpriteSheet = pirateSwimSpriteSheets[pirateSwimFrame];
  }
  pirateSpriteSheet.drawFrame(
    pirateFrame,
    person.body.position.x - PERSON_WIDTH,
    person.body.position.y - PERSON_HEIGHT,
    PERSON_WIDTH * 2,
    PERSON_HEIGHT * 2
  );
  fill(60);
  noStroke();
  drawComposite(person.chain);

  if (frameCount % 10 == 0) {
    rockFrame = (rockFrame + 1) % 8;
  }
  rockSpriteSheet.drawFrame(
    rockFrame,
    person.rock.position.x - ROCK_RADIUS * 2,
    person.rock.position.y - ROCK_RADIUS * 2,
    ROCK_RADIUS * 4,
    ROCK_RADIUS * 4
  );
}

let jellies = [];
function spawnJelly(x, y) {
  let width = 40;
  let head = Bodies.trapezoid(x, y, width, 10, PI / 6);
  Composite.add(engine.world, head);

  let tentacles = [];
  let N = 3;
  for (var i = 0; i < N; i++) {
    let p = i / (N - 1);
    var group = Body.nextGroup(true);
    let joinX = (p - 0.5) * width * 0.5;
    let joinY = 0;
    let tentacle = Composites.stack(
      x + joinX,
      y + joinY,
      1,
      8,
      0,
      0,
      function (x, y) {
        return Bodies.rectangle(x, y, 5, 2);
      }
    );
    Composites.chain(tentacle, 0.5, 0, -0.5, 0, {
      stiffness: 0.8,
      length: 2,
    });
    Composite.add(engine.world, tentacle);
    Composite.add(
      engine.world,
      Constraint.create({
        bodyA: head,
        bodyB: tentacle.bodies[0],
        pointA: { x: joinX, y: joinY },
        stiffness: 0.5,
      })
    );
    tentacles.push(tentacle);
  }

  jellies.push([head, tentacles]);
}

function updateJellySystem() {
  jellies.forEach(([h, ts]) => {
    if (random() < 0.01) {
      Body.applyForce(
        h,
        h.position,
        Vector.rotate(Vector.create(0, -0.001), h.angle)
      );
    }
  });
}

function drawJellySystem() {
  jellies.forEach(([h, ts]) => {
    drawVerticies(h.vertices);
    ts.forEach((t) => drawComposite(t));
  });
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
  pauseIsOver = millis() - outOfEnergyTime > 3000;
  if (m && person.energy > 0 && pauseIsOver) {
    Body.applyForce(
      person.body,
      person.body.position,
      Vector.rotate(Vector.create(0, -0.0004), person.body.angle)
    );
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
    let pos = add(
      createVector(person.body.position.x, person.body.position.y),
      createVector(PERSON_WIDTH / 2, 10)
    );
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

function draw() {
  background(10, 30, 50);
  let mouse = createVector(mouseX, mouseY);
  let pirateLegs = add(person.pos, anchorPointDelta);
  updateBallPos({ pos: pirateLegs });
  updatePerson();
  updateBubbleSystem();
  updateJellySystem();
  fill(255);

  let pirateFrame = floor(min(mouseX / windowWidth, 1) * 7);

  let pirateSpriteSheet = pirateIdleSpriteSheets[pirateIdleFrame];
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

  // draw matter stuff
  stroke(255);
  fill(255);

  drawVerticies(person.body.vertices);
  drawVerticies(person.rock.vertices);
  stroke(128);
  strokeWeight(2);
  drawJellySystem();
  drawPirate();
}

function drawConstraint(constraint) {
  const offsetA = constraint.pointA;
  let posA = { x: 0, y: 0 };
  if (constraint.bodyA) {
    posA = constraint.bodyA.position;
  }
  const offsetB = constraint.pointB;
  let posB = { x: 0, y: 0 };
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

function drawComposite(composite) {
  composite.bodies.forEach((b) => drawVerticies(b.vertices));
}

function drawVerticies(vertices) {
  beginShape();
  for (let i = 0; i < vertices.length; i++) {
    vertex(vertices[i].x, vertices[i].y);
  }
  endShape(CLOSE);
}
