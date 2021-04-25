// SPRITESHEETS
// https://code-dot-org.github.io/p5.play/docs/classes/SpriteSheet.html
const debug = false;

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
const Events = Matter.Events;

const vec = Vector.create;
const add = Vector.add;
const sub = Vector.sub;
const mult = Vector.mult;
const div = Vector.div;
const norm = Vector.normalise;
const mag = Vector.magnitude;
const rotateVec = Vector.rotate;

const AIR = 0.9;
const CHAIN_LENGTH = 150;
const GRAVITY = 0.4;
const MAX_ENERGY = 1500;
const PERSON_HEIGHT = 24 * 1.5; // multiples of 24
const PERSON_WIDTH = 16 * 1.5; // multiples of 16
const ROCK_RADIUS = 10;

let engine;
let bubbles = [];
let canvas;
let outOfEnergyTime = -100000;
let person;
let camera = vec(0, 0);
let mouse = vec(0, 0);
let swimming = false;
let dead = false;
let maxOxygen;
let oxygen;

let pirateIdleSpriteSheet;
let pirateSwimSpriteSheets;
let rockSpriteSheet;

let rad2vec = (rad) => vec(cos(rad), sin(rad));
let noiseVec = (x, y, t) => rad2vec(noise(x, y, t) * PI * 2);
let lerpVec = (v1, v2, p) => vec(lerp(v1.x, v2.x, p), lerp(v1.y, v2.y, p));
let distVec = (v1, v2) => mag(sub(v2, v1));

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

  engine = Engine.create();
  engine.gravity.y = 0.05;

  // const mouse = Mouse.create(canvas.elt);
  // const mouseParams = {
  //   mouse: mouse,
  //   constraint: { stiffness: 0.05 },
  // };
  // mouseConstraint = MouseConstraint.create(engine, mouseParams);
  // mouseConstraint.mouse.pixelRatio = pixelDensity();
  // World.add(engine.world, mouseConstraint);

  spawnPirate(windowWidth / 2, 100);

  for (var i = 0; i < 10; i++) {
    spawnJelly(random(windowWidth), random(windowHeight));
  }
  Engine.run(engine);

  for (var i = 0; i < 50; i++) {
    bubbles.push({
      pos: vec(random(0, windowWidth), random(0, windowHeight)),
      velocity: vec(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }
  maxOxygen = oxygen = random(2, 4) * 1000 * 60;
  console.log(`${(maxOxygen / 60000).toFixed(2)} minutes of oxygen this game`);
}

function spawnPirate(x, y) {
  console.log("Spawning pirate");
  group = Body.nextGroup(true);
  person = {
    energy: MAX_ENERGY,
    health: 1,
  };
  person.body = Bodies.rectangle(x, y, PERSON_WIDTH, PERSON_HEIGHT, {
    inertia: 100,
    frictionAir: 0.03,
  });

  let chainX = person.body.position.x;
  let chainY = person.body.position.y + PERSON_HEIGHT / 2;
  let chainLinkLength = 10;
  person.chain = Composites.stack(chainX, chainY, 8, 1, 0, 0, function (x, y) {
    return Bodies.rectangle(x, y, chainLinkLength, 3, {
      collisionFilter: { group: group },
    });
  });
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
    ROCK_RADIUS,
    { mass: 1.5 }
  );

  World.add(engine.world, [
    person.body,
    person.rock,
    person.chain,
    Constraint.create({
      bodyA: lastChainBody,
      bodyB: person.rock,
      pointA: { x: chainLinkLength, y: 0 },
      pointB: { x: 0, y: 0 },
      stiffness: 0.5,
    }),
  ]);

  Events.on(engine, "collisionStart", (event) => {
    let pairs = event.pairs;

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (
        (pair.bodyA === person.body && pair.bodyB.isJellyTentacle) ||
        (pair.bodyB === person.body && pair.bodyA.isJellyTentacle)
      ) {
        damagePirate(0.05);
      }
    }
  });
}

function damagePirate(damage) {
  console.log("damage", damage);
  person.health = max(0, person.health - damage);
  if (person.health == 0) {
    dead = true;
  }
}

let rockFrame = 0;
let pirateSwimFrame = 0;
let pirateIdleFrame = 0;
function drawPirate() {
  let pirateFrame = floor(
    ((min(max((mouse.x - person.body.position.x) / 500, -1), 1) + 1) / 2) * 7
  );
  if (frameCount % 10 == 0) {
    pirateSwimFrame = (pirateSwimFrame + 1) % pirateSwimSpriteSheets.length;
    pirateIdleFrame = (pirateIdleFrame + 1) % pirateIdleSpriteSheets.length;
  }
  let pirateSpriteSheet = pirateIdleSpriteSheets[pirateIdleFrame];
  if (swimming) {
    pirateSpriteSheet = pirateSwimSpriteSheets[pirateSwimFrame];
  }
  translate(person.body.position.x, person.body.position.y);
  rotate(person.body.angle);
  fill(40);
  stroke(0);
  rect(-PERSON_WIDTH, -PERSON_HEIGHT, PERSON_WIDTH * 2, 5);
  fill((1 - pow(person.health, 2)) * 255, pow(person.health, 2) * 255, 0);
  rect(-PERSON_WIDTH, -PERSON_HEIGHT, PERSON_WIDTH * 2 * person.health, 5);
  pirateSpriteSheet.drawFrame(
    pirateFrame,
    -PERSON_WIDTH,
    -PERSON_HEIGHT,
    PERSON_WIDTH * 2,
    PERSON_HEIGHT * 2
  );

  for (var i = 0; i < 5; i++) {
    if (i % 2) {
      stroke(40);
    } else {
      stroke(50);
    }
    noFill();
    strokeWeight(3);
    let clamp = (v, m, M) => min(max(v, m), M);
    let chainKnotRadius = PERSON_WIDTH * 0.45;
    let iOffset = i * 3 - 2;
    curve(
      -chainKnotRadius,
      iOffset,
      -chainKnotRadius,
      15 + iOffset,
      chainKnotRadius,
      15 + iOffset,
      chainKnotRadius,
      iOffset
    );
  }
  rotate(-person.body.angle);
  translate(-person.body.position.x, -person.body.position.y);

  fill(60);
  noStroke();
  drawComposite(person.chain);

  if (frameCount % 10 == 0) {
    rockFrame = (rockFrame + 1) % 8;
  }

  translate(person.rock.position.x, person.rock.position.y);
  rotate(person.rock.angle);
  rockSpriteSheet.drawFrame(
    rockFrame,
    -ROCK_RADIUS * 2,
    -ROCK_RADIUS * 2,
    ROCK_RADIUS * 4,
    ROCK_RADIUS * 4
  );
  rotate(-person.rock.angle);
  translate(-person.rock.position.x, -person.rock.position.y);

  if (debug) {
    noFill();
    stroke(255, 0, 0);
    drawVerticies(person.body.vertices);
    drawVerticies(person.rock.vertices);
  }
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
    let tentacle = Composites.stack(x + joinX, y + joinY, 1, 8, 0, 0, function (
      x,
      y
    ) {
      let tentaclePart = Bodies.rectangle(x, y, 5, 2);
      tentaclePart.isJellyTentacle = true;
      return tentaclePart;
    });
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
      Body.applyForce(h, h.position, rotateVec(vec(0, -0.001), h.angle));
    }
  });
}

function drawJellySystem() {
  jellies.forEach(([h, ts]) => {
    noStroke();
    fill(130, 200, 240);
    drawVerticies(h.vertices);
    ts.forEach((t) => drawComposite(t));
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function updatePirate() {
  let clampedDt = max(deltaTime, 1.0);
  let forceVec = mult(norm(sub(mouse, person.body.position)), 0.0003);
  forceVec.y *= 0.3;
  Body.applyForce(person.body, person.body.position, forceVec);
  swimUp(mouseIsPressed);
}

function swimUp(m) {
  pauseIsOver = millis() - outOfEnergyTime > 3000;
  if (m && person.energy > 0 && pauseIsOver) {
    Body.applyForce(
      person.body,
      person.body.position,
      rotateVec(vec(0, -0.0004), person.body.angle)
    );
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
  rect(
    camera.x,
    camera.y + windowHeight - 50,
    (windowWidth * person.energy) / MAX_ENERGY,
    20
  );
}

function updateBubbleSystem() {
  let BUBBLE_BOUNDS = sqrt(
    windowWidth * windowWidth + windowHeight * windowHeight
  );

  if (random() < 0.1) {
    bubbles.push({
      pos: add(
        camera,
        vec(random(-BUBBLE_BOUNDS, BUBBLE_BOUNDS), BUBBLE_BOUNDS)
      ),
      velocity: vec(0, random(-0.1, -0.2)),
      radius: random(3, 10),
    });
  }

  let noiseTime = millis() * 0.0001;
  let noiseScale = 0.1;
  if (random() < (swimming ? 0.5 : 0.1)) {
    let pos = add(person.body.position, vec(0, -PERSON_HEIGHT * 0.25));
    bubbles.push({
      pos: pos,
      velocity: mult(
        vec(
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
    bubble.pos = add(bubble.pos, mult(bubble.velocity, deltaTime));
    let randomness = mult(
      vec(
        noise(bubble.pos.x * noiseScale, noiseTime) - 0.5,
        noise(bubble.pos.y * noiseScale, noiseTime) - 0.5
      ),
      0.01
    );
    bubble.velocity = add(bubble.velocity, randomness);
    bubble.velocity = add(bubble.velocity, vec(0, -0.005));
    bubble.velocity.y *= lerp(AIR, 1, 0.8);
    if (dist(bubble.pos, camera) > BUBBLE_BOUNDS * 1.3) {
      toRemove.push(i);
    } else if (random() < 0.001 * bubble.radius && bubble.radius > 5) {
      toRemove.push(i);
      let offsetR = 3;
      let offset = vec(random(-offsetR, offsetR), random(-offsetR, offsetR));
      let pos1 = add(bubble.pos, offset);
      let r1 = random(0, bubble.radius);
      bubbles.push({
        pos: pos1,
        velocity: add(
          bubble.velocity,
          mult(
            vec(
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
            vec(
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

function drawBubbleSystem() {
  for (var i = 0; i < bubbles.length; i++) {
    let bubble = bubbles[i];
    fill(255, 50);
    stroke(255, 80);
    circle(bubble.pos.x, bubble.pos.y, bubble.radius);
  }
}

function draw() {
  if (dead) {
    drawDeathScreen();
    return;
  }
  background(10, 30, 50);

  camera = lerpVec(
    camera,
    sub(person.body.position, mult(vec(windowWidth, windowHeight), 0.5)),
    0.01
  );

  mouse = add(camera, vec(mouseX, mouseY));

  translate(-camera.x, -camera.y);

  updatePirate();
  updateBubbleSystem();
  updateJellySystem();
  fill(255);

  drawJellySystem();
  drawPirate();
  drawBubbleSystem();
  translate(camera.x, camera.y);
  drawOxygenOverlay();
}

function drawOxygenOverlay() {
  oxygen -= deltaTime;
  oxygenPercentage = max(1 - oxygen / maxOxygen, 0);
  fill(`rgba(0, 0, 0, ${oxygenPercentage})`);
  rect(0, 0, windowWidth, windowHeight);
  if (oxygen < 0) {
    dead = true;
  }
}

function drawDeathScreen() {
  background(0);
  textSize(64);
  fill(255);
  textAlign(CENTER);
  msg = person.health <= 0 ? "You Have Died." : "You Have Run Out Of Oxygen.";
  text(msg, windowWidth / 2, windowHeight / 2);
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
