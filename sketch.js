// text(this.mass, this.position.x + this.size / 2, this.position.y - this.size / 2)
// let dx = anchor.position.x - weight.position.x
// let dy = anchor.position.y - weight.position.y
// this.angle = atan2(dx, dy)
// text(degrees(this.angle).toFixed(2) + "°", this.position.x + this.size / 2, this.position.y - this.size / 4)
// text((-cos(this.angle) * this.mass).toFixed(2) + "↓", this.position.x + this.size / 2, this.position.y)
// text((tan(this.angle) * this.mass).toFixed(2) + "←", this.position.x + this.size / 2, this.position.y + this.size / 4)



HEIGHT = 800;
WIDTH = 1200;

weights = [];
ropes = [];
anchors = [];

current_rope = null;

function setup() {
  world = createWorld();
  createCanvas(WIDTH, HEIGHT);

  anchor = new Anchor(400, 200);
  weight = new Weight(600, 400);
  weights.push(weight);
  anchors.push(anchor);

  let djd = new box2d.b2DistanceJointDef();
  // Connection between previous particle and this one
  djd.bodyA = anchor.body;
  djd.bodyB = weight.body;
  // Equilibrium length
  djd.length = scaleToWorld(300);

  // These properties affect how springy the joint is
  djd.frequencyHz = 4.9; // Try a value less than 5 (0 for no elasticity)
  djd.dampingRatio = 0.1; // Ranges between 0 and 1 (1 for no springiness)

  // Make the joint.  Note we aren't storing a reference to the joint ourselves anywhere!
  // We might need to someday, but for now it's ok
  dj = world.CreateJoint(djd);
  
  console.log(dj.prototype);

  
  // rope = new Rope(weight.position.x, weight.position.y);
  // rope.add_bend(anchor.position.x, anchor.position.y);
  // append(ropes, rope);
}

function draw() {
  background(220);


  // We must always step through time!
  let timeStep = 1.0 / 30;
  // 2nd and 3rd arguments are velocity and position iterations
  world.Step(timeStep, 10, 10);

  weights.forEach(function(weight) {
    weight.display();
  });

  anchors.forEach(function(anchor) {
    anchor.display();
  });

  ropes.forEach(function(rope) {
    rope.display();
  });
}

function keyReleased() {
  if (keyCode == SHIFT && current_rope != null) {
    if (current_rope.bends.length == 1) {
      ropes.pop();
    }
    current_rope = null;
  }
}

function mouseClicked() {
  if (keyIsPressed && keyCode == CONTROL) {
    anchors.push(new Anchor(mouseX, mouseY));
  } else if (keyIsPressed && keyCode == SHIFT) {
    if (current_rope == null) {
      current_rope = new Rope(mouseX, mouseY);
      ropes.push(current_rope);
    } else {
      current_rope.add_bend(mouseX, mouseY);
    }
  } else {
    weights.push(new Weight(mouseX, mouseY));
  }
}

// Class used to model a rope to connect objects
class Rope {
  constructor(x, y) {
    this.bends = [];
    this.add_bend(x, y);
  }

  update() {

  }

  add_bend(x, y) {
    for (let i = 0; i < objects.length; i++) {
      if(dist(x, y, objects[i].position.x, objects[i].position.y) < 25)
        {
          append(this.bends, objects[i]);
          break;
        }
    }
  }

  draw() {

    noFill();
    strokeWeight(3.0);
    strokeJoin(ROUND);
    beginShape();
    for (let i = 0; i < this.bends.length; i++) {
      vertex(this.bends[i].position.x, this.bends[i].position.y);
    }
    if (current_rope == this) {
      vertex(mouseX, mouseY);
    }
    endShape();
  }
}

// Class used to model anchor points for ropes
class Anchor {
  constructor(x, y) {
    let bd = new box2d.b2BodyDef();
    bd.type = box2d.b2BodyType.b2_staticBody;
    bd.position = scaleToWorld(x, y);

    // Define a fixture
    let fd = new box2d.b2FixtureDef();
    // Fixture holds shape
    fd.shape = new box2d.b2PolygonShape();
    fd.shape.SetAsBox(scaleToWorld(this.mass / 2), scaleToWorld(this.mass / 2));

    // Some physics
    fd.density = 1.0;
    fd.friction = 0.5;
    fd.restitution = 0.2;

    // Create the body
    this.body = world.CreateBody(bd);
    // Attach the fixture
    this.body.CreateFixture(fd);

    // Some additional stuff
    this.body.SetLinearVelocity(new box2d.b2Vec2(0, 0));
    this.body.SetAngularVelocity(0);
  }

  display() {
    let pos = scaleToPixels(this.body.GetPosition());
    fill("#abc");
    circle(pos.x, pos.y, 30);
    fill("#555");
    text("load: " + this.sum, pos.x + 20, pos.y);
  }
}

class Weight {
  constructor(x, y) {
    this.mass = 42

    // Define a body
    let bd = new box2d.b2BodyDef();
    bd.type = box2d.b2BodyType.b2_dynamicBody;
    bd.position = scaleToWorld(x, y);

    // Define a fixture
    let fd = new box2d.b2FixtureDef();
    // Fixture holds shape
    fd.shape = new box2d.b2PolygonShape();
    fd.shape.SetAsBox(scaleToWorld(this.mass / 2), scaleToWorld(this.mass / 2));

    // Some physics
    fd.density = 1.0;
    fd.friction = 0.5;
    fd.restitution = 0.2;

    // Create the body
    this.body = world.CreateBody(bd);
    // Attach the fixture
    this.body.CreateFixture(fd);

    // Some additional stuff
    this.body.SetLinearVelocity(new box2d.b2Vec2(0, 0));
    this.body.SetAngularVelocity(0);
  }

  // This function removes the particle from the box2d world
  killBody() {
    world.DestroyBody(this.body);
  }

  // Is the particle ready for deletion?
  done() {
    // Let's find the screen position of the particle
    let pos = scaleToPixels(this.body.GetPosition());
    // Is it off the bottom of the screen?
    if (pos.y > height) {
      this.killBody();
      return true;
    }
    return false;
  }

  // Drawing the box
  display() {
    // Get the body's position
    let pos = scaleToPixels(this.body.GetPosition());
    // Get its angle of rotation
    let a = this.body.GetAngleRadians();

    // Draw it!
    rectMode(CENTER);
    push();
    translate(pos.x, pos.y);
    rotate(a);
    fill("#555");
    stroke(200);
    strokeWeight(2);
    rect(0, 0, this.mass, this.mass);
    pop();
  }
}