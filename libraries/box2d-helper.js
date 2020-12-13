
// -----------------------------------------------------------------------------
// Scale Methods
// -----------------------------------------------------------------------------

var scaleFactor;

var scaleToWorld = function(a,b) {
  if (a instanceof planck.Vec2) {
    var newv = new planck.Vec2();
    newv.x = (a.x)/scaleFactor;
    newv.y = (a.y)/scaleFactor;
    return newv;
  } else if ("undefined"!=typeof b) {
    var newv = new planck.Vec2();
    newv.x = (a)/scaleFactor;
    newv.y = (b)/scaleFactor;
    return newv;
  } else {
    return a.mul(1/scaleFactor);
  }
};

var scaleToPixels = function(a,b) {
  if (a instanceof planck.Vec2) {
    var newv = new planck.Vec2();
    newv.x = a.x*scaleFactor;
    newv.y = a.y*scaleFactor;
    return newv;
  } else if ("undefined"!=typeof b) {
    var newv = new planck.Vec2();
    newv.x = a*scaleFactor;
    newv.y = b*scaleFactor;
    return newv;
  } else {
    return a*scaleFactor;
  }
};

// -----------------------------------------------------------------------------
// Create Methods
// -----------------------------------------------------------------------------

var createWorld = function() {

	var world = planck.World({
    gravity: new planck.Vec2(0, 9.81),
    allowSleep: false
  });

  scaleFactor = 10;

	return world
};

// -----------------------------------------------------------------------------
// Draw Methods
// -----------------------------------------------------------------------------

var debugDraw = function(canvas, scale, world) {

	var context = canvas.getContext('2d');
  context.fillStyle = '#DDD';
  context.fillRect(0, 0, canvas.width, canvas.height);

	// Draw joints
	for(var j=world.m_jointList; j; j=j.m_next) {
    context.lineWidth = 0.25;
    context.strokeStyle = '#00F';
    drawJoint(context, scale, world, j);
  }

	// Draw body shapes
	for(var b=world.m_bodyList; b; b=b.m_next) {
		for(var f = b.GetFixtureList(); f!==null; f=f.GetNext()) {
      context.lineWidth = 0.5;
			context.strokeStyle = '#F00';
      drawShape(context, scale, world, b, f);
    }
  }
};

var drawJoint = function(context, scale, world, joint) {
	context.save();
  context.scale(scale,scale);
  context.lineWidth /= scale;

  var b1 = joint.m_bodyA;
  var b2 = joint.m_bodyB;
  var x1 = b1.GetPosition();
  var x2 = b2.GetPosition();
  var p1 = joint.GetAnchorA();
  var p2 = joint.GetAnchorB();

  context.beginPath();
  switch (joint.m_type) {
    case box2d.b2Joint.e_distanceJoint:
      context.moveTo(p1.x, p1.y);
      context.lineTo(p2.x, p2.y);
      break;
    default: {
      if (b1 == world.m_groundBody) {
        context.moveTo(p1.x, p1.y);
        context.lineTo(x2.x, x2.y);
      }
      else if (b2 == world.m_groundBody) {
        context.moveTo(p1.x, p1.y);
        context.lineTo(x1.x, x1.y);
      }
      else {
        context.moveTo(x1.x, x1.y);
        context.lineTo(p1.x, p1.y);
        context.lineTo(x2.x, x2.y);
        context.lineTo(p2.x, p2.y);
      }
    } break;
  }
  context.closePath();
  context.stroke();
  context.restore();
};

var drawShape = function(context, scale, world, body, fixture) {

  context.save();
  context.scale(scale,scale);

  var bPos = body.GetPosition();
  context.translate(bPos.x, bPos.y);
  context.rotate(body.GetAngleRadians());

  context.beginPath();
  context.lineWidth /= scale;

	var shape = fixture.m_shape;
  switch(shape.m_type) {
    case box2d.b2ShapeType.e_circleShape: {
      var r = shape.m_radius;
      var segments = 16.0;
      var theta = 0.0;
      var dtheta = 2.0 * Math.PI / segments;

      context.moveTo(r, 0);
      for (var i = 0; i < segments; i++) {
        context.lineTo(r + r * Math.cos(theta), r * Math.sin(theta));
        theta += dtheta;
      }
      context.lineTo(r, 0);
    } break;

    case box2d.b2ShapeType.e_polygonShape:
    case box2d.b2ShapeType.e_chainShape: {

      var vertices = shape.m_vertices;
      var vertexCount = shape.m_count;
      if (!vertexCount) return;

      context.moveTo(vertices[0].x, vertices[0].y);
      for (var i = 0; i < vertexCount; i++)
        context.lineTo(vertices[i].x, vertices[i].y);
    } break;
  }

  context.closePath();
  context.stroke();
  context.restore();
};
