import React from "react";
import {
    Button,
    Layout,
    PageHeader,
    Row,
    Col,
    Card,
    Space,
    Input,
    Radio,
} from "antd";
import shopPaymentsSave from "../../requests/ShopPayments/ShopPaymentsSave";
import shopPaymentDatatable from "../../requests/ShopPayments/ShopPaymentsDatatable";

const {Content} = Layout;

class ShopPayments extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            cashActive: 2,
            terminalActive: 2,
            stripeActive: 2,
            stripePublicKey: "",
            stripePrivateKey: "",
            paystackActive: 2,
            paystackPublicKey: "",
            paystackPrivateKey: "",
            shop_id: props.shop_id
        };

        this.getById(props.shop_id);
    }

    getById = async (id) => {
        let data = await shopPaymentDatatable(id);
        data = data['data'];
        if (data['data'] != null) {
            for (var i = 0; i < data['data'].length; i++) {
                if (data['data'][i]['id_payment'] == 1 && data['data'][i]['active'] == 1) {
                    this.setState({
                        cashActive: 1
                    });
                } else if(data['data'][i]['id_payment'] == 2 && data['data'][i]['active'] == 1) {
                    this.setState({
                        terminalActive: 1
                    });
                } else if(data['data'][i]['id_payment'] == 3 && data['data'][i]['active'] == 1) {
                    this.setState({
                        stripeActive: 1,
                        stripePublicKey: data['data'][i]['key_id'],
                        stripePrivateKey: data['data'][i]['secret_id'],
                    });
                } else if(data['data'][i]['id_payment'] == 4 && data['data'][i]['active'] == 1) {
                    this.setState({
                        paystackActive: 1,
                        paystackPublicKey: data['data'][i]['key_id'],
                        paystackPrivateKey: data['data'][i]['secret_id'],
                    });
                }
            }
        }
        console.log(data['data']);
    }

    savePayment = async (id_shop, id_payment, active, key_id = "", secret_id = "") => {
        let data = await shopPaymentsSave(id_shop, id_payment, active, key_id, secret_id);
    }

    render() {
        return (
            <PageHeader className="site-page-header">
                <Content className="site-layout-background">
                    <Row gutter={20}>
                        <Col className="col col-md-6">
                            <Card title="Cash">
                                <h6 className="m-2">Cash</h6>
                                <Radio.Group
                                    onChange={(e) => {
                                        this.setState({
                                            cashActive: e.target.value
                                        })
                                    }}
                                    value={this.state.cashActive}
                                    className="m-2"
                                >
                                    <Space direction="vertical">
                                        <Radio value={1}>Active</Radio>
                                        <Radio value={2}>Inactive</Radio>
                                    </Space>
                                </Radio.Group>
                                <br/>
                                <Button
                                    size="large"
                                    style={{marginTop: 10}}
                                    type="primary"
                                    onClick={() => this.savePayment(this.state.shop_id, 1, this.state.cashActive)}
                                >
                                    Save
                                </Button>
                            </Card>
                        </Col>
                        <Col className="col col-md-6">
                            <Card title="Terminal">
                                <h6 className="m-2">Terminal</h6>
                                <Radio.Group
                                    onChange={(e) => {
                                        this.setState({
                                            terminalActive: e.target.value
                                        })
                                    }}
                                    value={this.state.terminalActive}
                                    className="m-2"
                                >
                                    <Space direction="vertical">
                                        <Radio value={1}>Active</Radio>
                                        <Radio value={2}>Inactive</Radio>
                                    </Space>
                                </Radio.Group>
                                <br/>
                                <Button
                                    size="large"
                                    style={{marginTop: 10}}
                                    type="primary"
                                    onClick={() => this.savePayment(this.state.shop_id, 2, this.state.cashActive)}
                                >
                                    Save
                                </Button>
                            </Card>
                        </Col>
                        <Col className="col col-md-6" style={{marginTop: '20px'}}>
                            <Card title="Stripe">
                                <h6 className="m-2">Stripe</h6>
                                <Radio.Group
                                    onChange={(e) => {
                                        this.setState({
                                            stripeActive: e.target.value
                                        })
                                    }}
                                    value={this.state.stripeActive}
                                    className="m-2"
                                >
                                    <Space direction="vertical">
                                        <Radio value={1}>Active</Radio>
                                        <Radio value={2}>Inactive</Radio>
                                    </Space>
                                </Radio.Group>
                                <h6 className="m-2">Published Key</h6>
                                <Input value={this.state.stripePublicKey} onChange={(e) => {
                                    this.setState({
                                        stripePublicKey: e.target.value
                                    })
                                }}/>
                                <h6 className="m-2">API Key</h6>
                                <Input value={this.state.stripePrivateKey} onChange={(e) => {
                                    this.setState({
                                        stripePrivateKey: e.target.value
                                    })
                                }}/>
                                <Button
                                    size="large"
                                    style={{marginTop: 10}}
                                    type="primary"
                                    onClick={() => this.savePayment(this.state.shop_id, 3, this.state.stripeActive, this.state.stripePublicKey, this.state.stripePrivateKey)}
                                >
                                    Save
                                </Button>
                            </Card>
                        </Col>
                        <Col className="col col-md-6" style={{marginTop: '20px'}}>
                            <Card title="Paystack">
                                <h6 className="m-2">Paystack</h6>
                                <Radio.Group
                                    onChange={(e) => {
                                        this.setState({
                                            paystackActive: e.target.value
                                        })
                                    }}
                                    value={this.state.paystackActive}
                                    className="m-2"
                                >
                                    <Space direction="vertical">
                                        <Radio value={1}>Active</Radio>
                                        <Radio value={2}>Inactive</Radio>
                                    </Space>
                                </Radio.Group>
                                <h6 className="m-2">Published Key</h6>
                                <Input value={this.state.paystackPublicKey} onChange={(e) => {
                                    this.setState({
                                        paystackPublicKey: e.target.value
                                    })
                                }}/>
                                <h6 className="m-2">API Key</h6>
                                <Input value={this.state.paystackPrivateKey} onChange={(e) => {
                                    this.setState({
                                        paystackPrivateKey: e.target.value
                                    })
                                }}/>
                                <Button
                                    size="large"
                                    style={{marginTop: 10}}
                                    type="primary"
                                    onClick={() => this.savePayment(this.state.shop_id, 4, this.state.paystackActive, this.state.paystackPublicKey, this.state.paystackPrivateKey)}
                                >
                                    Save
                                </Button>
                            </Card>
                        </Col>
                    </Row>
                </Content>
            </PageHeader>
        );
    }
}

export default ShopPayments;
