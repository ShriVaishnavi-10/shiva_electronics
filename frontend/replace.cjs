const fs = require('fs');
let file = fs.readFileSync('src/components/SalesForm.jsx', 'utf8');

// 1. Convert outer Row to align-items-stretch and Col md=12 to md=4
file = file.replace(
  '<Row className="mb-3 g-3">\n        <Col md={12} className="position-relative">',
  '<Row className="mb-4 g-3 align-items-stretch">\n        <Col md={4} className="d-flex flex-column gap-3">\n          <div className="position-relative">'
);

// 2. Change the closing of the customer search col
file = file.replace(
  '</Card>\n          )}\n        </Col>\n      </Row>\n\n      {selectedCustomer && (',
  '</Card>\n          )}\n          </div>\n\n      {selectedCustomer && ('
);

// 3. Make Address cards xs=6 and smaller text
file = file.replace(
  '<Row className="mb-3 g-3">\n          <Col md={6}>\n            <Card className="h-100 shadow-sm border-0">\n              <CardBody>\n                <Label\n                  className="fw-bold small mb-2 text-uppercase"\n                  style={{ color: "#D4AF37", letterSpacing: "1px" }}\n                >\n                  Billing Address\n                </Label>',
  '<Row className="g-2 flex-grow-1">\n          <Col xs={6}>\n            <Card className="h-100 shadow-sm border-0">\n              <CardBody className="p-3">\n                <Label\n                  className="fw-bold small mb-2 text-uppercase"\n                  style={{ color: "#D4AF37", letterSpacing: "1px", fontSize: "0.7rem" }}\n                >\n                  Billing Address\n                </Label>'
);

file = file.replace(
  '<Col md={6}>\n            <Card className="h-100 shadow-sm border-0">\n              <CardBody>\n                <Label\n                  className="fw-bold small mb-2 text-uppercase"\n                  style={{ color: "#D4AF37", letterSpacing: "1px" }}\n                >\n                  Shipping Address\n                </Label>',
  '<Col xs={6}>\n            <Card className="h-100 shadow-sm border-0">\n              <CardBody className="p-3">\n                <Label\n                  className="fw-bold small mb-2 text-uppercase"\n                  style={{ color: "#D4AF37", letterSpacing: "1px", fontSize: "0.7rem" }}\n                >\n                  Shipping Address\n                </Label>'
);

// 4. Close the LEFT COLUMN and start the RIGHT COLUMN for the Form card
file = file.replace(
  '</Card>\n          </Col>\n        </Row>\n      )}\n\n      <Card className="mb-4 shadow-sm border-0">',
  '</Card>\n          </Col>\n        </Row>\n      )}\n        </Col>\n\n        {/* RIGHT COLUMN */}\n        <Col md={8}>\n      <Card className="h-100 shadow-sm border-0 bg-white rounded">'
);

// 5. Close the RIGHT COLUMN after the Transport charges Row, and change the product table col from md=8 to md=9
file = file.replace(
  '</Col>\n          </Row>\n        </CardBody>\n      </Card>\n\n      <Row className="g-3 mb-4">\n        {/* LEFT SIDE (Items) */}\n        <Col md={8}>',
  '</Col>\n          </Row>\n        </CardBody>\n      </Card>\n        </Col>\n      </Row>\n\n      <Row className="g-3 mb-4">\n        {/* LEFT SIDE (Items) */}\n        <Col md={9}>'
);

// 6. Change the summary block col from md=4 to md=3
file = file.replace(
  '{/* RIGHT SIDE (Summary & Payment) */}\n        <Col md={4}>',
  '{/* RIGHT SIDE (Summary & Payment) */}\n        <Col md={3}>'
);

fs.writeFileSync('src/components/SalesForm.jsx', file);
console.log('Replacements done.');
