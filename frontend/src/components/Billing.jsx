import Header from "../components/Navbar";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
function Billing() {
  return (
    <>
   <Header />
      <div className="d-flex">
      

        {/* Main Dashboard Content */}
        <div className="main-content p-4 w-100">
          <Container fluid>
            <h4 className="fw-bold mb-4">Dashboard</h4>

            <Row>
              <Col md="4" sm="6" className="mb-4">
                <Card className="dashboard-card billing">
                  <CardBody>
                    <h6>Billing</h6>
                    <h3>₹ 1,25,000</h3>
                  </CardBody>
                </Card>
              </Col>

              <Col md="4" sm="6" className="mb-4">
                <Card className="dashboard-card pos">
                  <CardBody>
                    <h6>POS</h6>
                    <h3>320 Sales</h3>
                  </CardBody>
                </Card>
              </Col>

              <Col md="4" sm="6" className="mb-4">
                <Card className="dashboard-card inventory">
                  <CardBody>
                    <h6>Inventory</h6>
                    <h3>1,240 Items</h3>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </Container>
        </div>
      </div>

    
    </>
  );
}

export default Billing;
