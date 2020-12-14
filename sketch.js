HEIGHT = 800;
WIDTH = 1200;

weights = [];
ropes = [];
anchors = [];

current_rope = null;
draggingObject = null;

function setup() {
  frameRate(30);

  ropeSlider = createSlider(20.1, 55, 40);
  ropeSlider.position(20, 20);

  world = createWorld();
  createCanvas(WIDTH, HEIGHT);

  anchor = new Anchor(400, 200);
  anchors.push(anchor);
  anchor2 = new Anchor(800, 200);
  anchors.push(anchor2);
  
  weight = new Weight(600, 400);
  weights.push(weight);

  rope = new Rope(planck.RopeJoint({
    bodyA: anchor.body,
    localAnchorA: planck.Vec2(0.0, 0.0),
    bodyB: weight.body,
    localAnchorB: planck.Vec2(0.0, 0.0),
    maxLength: 25
  }))
  world.createJoint(rope.joint);

  ropes.push(rope);

  
  rope2 = new Rope(planck.RopeJoint({
    bodyA: anchor2.body,
    localAnchorA: planck.Vec2(0.0, 0.0),
    bodyB: weight.body,
    localAnchorB: planck.Vec2(0.0, 0.0),
    maxLength: 25
  }))
  world.createJoint(rope2.joint);

  ropes.push(rope2);
}

function draw() {
  let r = ropeSlider.value();
  rope.joint.setMaxLength(r);
  rope2.joint.setMaxLength(r);

  background(220);

  if(draggingObject !== null) {
    draggingObject.body.setPosition(scaleToWorld(mouseX, mouseY))
  }

  // We must always step through time!
  let timeStep = 1.0 / 30;
  // 2nd and 3rd arguments are velocity and position iterations
  world.step(timeStep);

  weights.forEach(function(weight) {
    weight.display();
  });

  anchors.forEach(function(anchor) {
    anchor.display();
  });

  ropes.forEach(function(rope) {
    rope.display();
  });

  text("fps " +  
         int(getFrameRate()), width - 40, 10); 
}

function keyReleased() {
  if (keyCode == SHIFT && current_rope != null) {
    if (current_rope.bends.length == 1) {
      ropes.pop();
    }
    current_rope = null;
  }
}

function mousePressed() {
  anchors.concat(weights).forEach(object => {
    let pos = scaleToPixels(object.body.getPosition())
    if(createVector(mouseX, mouseY).dist(createVector(pos.x, pos.y)) < 30) {
      draggingObject = object;
      object.body.setLinearVelocity(planck.Vec2());
      return;
    }
  });
}

function mouseClicked() {
  if(draggingObject !== null) {
    draggingObject = null;
    return;
  }
  if(mouseX < 230 && mouseY < 80) {
    return;
  }
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
  constructor(joint) {
    this.joint = joint
  }

  update() {

  }

  display() {
    //noFill();
    strokeWeight(3.0);
    strokeJoin(ROUND);
    let posA = scaleToPixels(this.joint.getBodyA().getPosition());
    let posB = scaleToPixels(this.joint.getBodyB().getPosition());
    line(posA.x, posA.y, posB.x, posB.y);
    strokeWeight(1.0);
  }
}

// Class used to model anchor points for ropes
class Anchor {
  constructor(x, y) {
    this.body = world.createBody();
    this.body.createFixture(planck.Circle(1.5));
    this.body.setPosition(scaleToWorld(x, y));
    this.body.setMassData({
      mass : 0,
      center : planck.Vec2(),
      I : 1
    })
  }

  display() {
    let pos = scaleToPixels(this.body.getPosition());
    fill("#abc");
    circle(pos.x, pos.y, 30);
    fill("#555");
    let force = planck.Vec2();
    let jointList = this.body.getJointList()
    let currentJoint = jointList
    while(currentJoint !== null) {
      force.add(currentJoint.joint.getReactionForce(1/30))
      currentJoint = currentJoint.next
    }
    text("load →: " + force.x.toFixed(2) + "kN", pos.x + 20, pos.y - 20);
    text("load ↑: " + force.y.toFixed(2) * -1 + "kN", pos.x + 20, pos.y);
    text("load sum: " + force.length().toFixed(2) + "kN", pos.x + 20, pos.y + 20);
  }
}

class Weight {
  constructor(x, y) {
    this.body = world.createDynamicBody({
      linearDamping: 0.3,
      angularDamping: 0.5
    });
    this.body.createFixture(planck.Box(2.5, 2.5));
    this.body.setPosition(scaleToWorld(x, y));
    this.body.setMassData({
      mass : 75,
      center : planck.Vec2(),
      I : 1
    })
  }

  // This function removes the particle from the box2d world
  killBody() {
    world.DestroyBody(this.body);
  }

  // Is the particle ready for deletion?
  done() {
    // Let's find the screen position of the particle
    let pos = scaleToPixels(this.body.getPosition());
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
    let pos = scaleToPixels(this.body.getPosition());
    // Get its angle of rotation
    let a = this.body.getAngle();

    // Draw it!
    rectMode(CENTER);
    push();
    translate(pos.x, pos.y);
    rotate(a);
    fill("#555");
    stroke(200);
    strokeWeight(2);
    rect(0, 0, 50, 50);
    pop();
    if(this.body.getJointList() !== null && 
       this.body.getJointList().next !== null && 
       this.body.getJointList().next.next === null) {
      let planckA = scaleToPixels(this.body.getJointList().next.joint.getBodyA().getPosition())
      let planckB = scaleToPixels(this.body.getJointList().joint.getBodyA().getPosition())
      let v1 = createVector(planckA.x - pos.x, planckA.y - pos.y)
      let v2 = createVector(planckB.x - pos.x, planckB.y - pos.y)
      let angle = degrees(v1.angleBetween(v2))
      text("angle: " + angle.toFixed(1) + "°", pos.x + 30, pos.y + 20)
    }
    text("mass: " + this.body.getMass() + "kg", pos.x + 30, pos.y)
  }
}