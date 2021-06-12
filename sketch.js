HEIGHT = 800;
WIDTH = 1200;

weights = [];
ropes = [];
anchors = [];

current_rope_start = null;
draggingObject = null;

function setup() {
  frameRate(30);

  document.addEventListener('contextmenu', event => event.preventDefault());

  ropeSlider = createSlider(20.1, 55, 40);
  ropeSlider.position(20, 20);

  world = createWorld();
  createCanvas(windowWidth, windowHeight);

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
  if(rope !== null) {
    rope.joint.setMaxLength(r);
  }
  if(rope2 !== null) {
    rope2.joint.setMaxLength(r);
  }

  background(220);

  if(draggingObject !== null) {
    draggingObject.body.setPosition(scaleToWorld(mouseX, mouseY))
  }

  // We must always step through time!
  let timeStep = 1.0 / 33;
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

// function keyReleased() {
//   if (keyCode == SHIFT && current_rope_start != null) {
//     if (current_rope.bends.length == 1) {
//       ropes.pop();
//     }
//     current_rope_start = null;
//   }
// }

function getObjectAt(x, y, objects) {
  for(let i = 0; i < objects.length; i++) {
    let pos = scaleToPixels(objects[i].body.getPosition())
    if(createVector(x, y).dist(createVector(pos.x, pos.y)) < 30) {
      return objects[i];
    }
  }
}

function mousePressed() {
  if (mouseButton === LEFT && !(keyIsPressed && keyCode === SHIFT)) {
    let object = getObjectAt(mouseX, mouseY, anchors.concat(weights));
    if (object !== null && typeof object != "undefined") {
      draggingObject = object;
      object.body.setLinearVelocity(planck.Vec2());
    }
  }
}

function keyPressed() {
  if(keyCode === DELETE || key === 'x') {
    object = getObjectAt(mouseX, mouseY, anchors.concat(weights));
    if (object !== null && typeof object != "undefined") {
      object.destroy();
    }
  }
}

function mouseReleased() {
  if (mouseButton === RIGHT) {
    let object = getObjectAt(mouseX, mouseY, anchors.concat(weights));
    if (object !== null && typeof object != "undefined") {
      if(object instanceof Weight){
        new_weight = window.prompt("enter new weight (kg)", object.getMass())
        if(Number.parseInt(new_weight) != "NaN") {
          object.setMass(constrain(new_weight, 1, Infinity));
        }
      } else if (object instanceof Anchor) {
        object.resetPeakForce();
      }
    }
  }
}

function mouseClicked() {
  // release dragged object
  if(draggingObject !== null) {
    draggingObject = null;
    return;
  }
  // ignore clicks in slider area
  if(mouseX < 230 && mouseY < 80) {
    return;
  }
  if (keyIsPressed && keyCode == CONTROL) {
    anchors.push(new Anchor(mouseX, mouseY));
  } else if (keyIsPressed && keyCode == SHIFT) {
    if (current_rope_start == null) {
      current_rope_start = getObjectAt(mouseX, mouseY, anchors.concat(weights));
    } else {
      let current_rope_end = getObjectAt(mouseX, mouseY, anchors.concat(weights))
      let joint = planck.RopeJoint({
        bodyA: current_rope_start.body,
        localAnchorA: planck.Vec2(0.0, 0.0),
        bodyB: current_rope_end.body,
        localAnchorB: planck.Vec2(0.0, 0.0),
        maxLength: 25
      });
      world.createJoint(joint);
      current_rope_start = null;
      let rope = new Rope(joint);
      ropes.push(rope);
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

  destroy() {
    world.destroyJoint(this.joint);
    for(let i = 0; i < ropes.length; i++) {
      if(ropes[i] === this) {
        ropes.splice(i, 1);
      }
    }
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
    this.resetPeakForce();
    this.body.setMassData({
      mass : 0,
      center : planck.Vec2(),
      I : 1
    })
  }

  resetPeakForce() {
    this.peakForceX = 0;
    this.peakForceY = 0;
    this.peakForceSum = 0;
  }

  destroy() {
    for(let i = 0; i < anchors.length; i++) {
      if(anchors[i] === this) {
        anchors.splice(i, 1);
      }
    }
    this.getConnectedRopes().forEach(rope => {
      rope.destroy()
    });
    world.destroyBody(this.body);
  }

  getConnectedRopes() {
    let ret = [];
    for(let i = 0; i < ropes.length; i++) {
      if(ropes[i].joint.getBodyA() === this.body || ropes[i].joint.getBodyB() === this.body) {
        ret.push(ropes[i]);
      }
    }
    return ret;
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
      if(currentJoint.joint.getBodyA().getType() !== "static" && currentJoint.joint.getBodyB().getType() !== "static" ) {
        force.add(currentJoint.joint.getReactionForce(1/30));
      }
      currentJoint = currentJoint.next;
    }
    this.peakForceX = max(this.peakForceX, abs(force.x));
    this.peakForceY = max(this.peakForceY, abs(force.y));
    this.peakForceSum = max(this.peakForceSum, abs(force.length()));
    text("load →: " + force.x.toFixed(2) + "kN, max: " + this.peakForceX.toFixed(2) + "kN", pos.x + 20, pos.y - 20);
    text("load ↑: " + force.y.toFixed(2) * -1 + "kN, max: " + this.peakForceY.toFixed(2) + "kN", pos.x + 20, pos.y);
    text("load sum: " + force.length().toFixed(2) + "kN, max: " + this.peakForceSum.toFixed(2) + "kN", pos.x + 20, pos.y + 20);
    if(current_rope_start !== null) {
      let pos = scaleToPixels(current_rope_start.body.getPosition());
      line(pos.x, pos.y, mouseX, mouseY);
    }
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
    this.setMass(75);
  }

  setMass(mass) {
    this.mass = mass
    this.body.setMassData({
      mass : mass,
      center : planck.Vec2(),
      I : 1
    })
  }

  getMass() {
    return this.mass;
  }

  getConnectedRopes() {
    let ret = [];
    for(let i = 0; i < ropes.length; i++) {
      if(ropes[i].joint.getBodyA() === this.body || ropes[i].joint.getBodyB() === this.body) {
        ret.push(ropes[i]);
      }
    }
    return ret;
  }

  destroy() {
    for(let i = 0; i < weights.length; i++) {
      if(weights[i] === this) {
        weights.splice(i, 1);
      }
    }
    this.getConnectedRopes().forEach(rope => {
      rope.destroy()
    });
    this.killBody();
  }

  // This function removes the particle from the box2d world
  killBody() {
    world.destroyBody(this.body);
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