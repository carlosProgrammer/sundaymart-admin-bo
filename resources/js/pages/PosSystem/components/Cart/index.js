import { DeleteOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Col, Image, Row } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import "../Tabs/style.css";

export default ({ placeOrder, cart, setCart, total, disable, bagIndex }) => {
    const { t } = useTranslation();

    const incrementQty = (index) => {
        const newData = [...cart];
        newData[bagIndex].products[index].qty += 1;

        const total = newData[bagIndex].products
            .reduce((cal, val) => cal + val.price * val.qty, 0)
            .toFixed(2);

        newData[bagIndex].total = (
            newData[bagIndex].tax * 1 +
            total * 1
        ).toFixed(2);
        setCart(newData);
    };
    const decrementQty = (index) => {
        const newData = [...cart];
        newData[bagIndex].products[index].qty -= 1;

        const total = newData[bagIndex].products
            .reduce((cal, val) => cal + val.price * val.qty, 0)
            .toFixed(2);

        newData[bagIndex].total = (
            newData[bagIndex].tax * 1 +
            total * 1
        ).toFixed(2);
        setCart(newData);
        // setTotal(total.toFixed(2));
    };
    const deleteProduct = (id) => {
        const newData = [...cart];
        const prod = cart[bagIndex].products.find((item) => item.id === id);
        // console.log("Old total", total);
        // console.log("Old prod", prod);
        // const newTotal =
        //     total -
        //     (prod?.price * prod?.qty).toFixed(2) -
        //     (prod?.tax * 1).toFixed(2);

        // const newTax = (newData[bagIndex].tax * 1 - prod?.tax * 1).toFixed(2);
        // console.log("New total ", newTotal);
        // console.log("New tax ", newTax);
        // newData[bagIndex].tax = (newTax * 1).toFixed(2);
        // newData[bagIndex].total = (newTotal * 1 + newTax * 1).toFixed(2);
        newData[bagIndex].products = newData[bagIndex].products.filter(
            (item) => item.id !== id
        );
        const total = newData[bagIndex].products.reduce(
            (cal, val) => cal + val.price * val.qty,
            0
        );
        const tax = newData[bagIndex].products.reduce(
            (cal, val) => cal + val.tax * 1,
            0
        );
        newData[bagIndex].tax = (tax * 1).toFixed(2);
        newData[bagIndex].total = (total * 1 + tax * 1).toFixed(2);
        setCart(newData);
    };
    const clearCart = () => {
        setCart([
            {
                products: [],
                total: 0,
                tax: 0,
                delivery_fee: 0,
                user: undefined,
                deliveryTime: undefined,
                address: undefined,
                deliveryDate: undefined,
                shippingId: undefined,
                shopId: undefined,
            },
        ]);
    };
    return (
        <>
            <div
                style={{
                    marginTop: 10,
                    minWidth: "350px",
                    width: "95%",
                    // maxWidth: "450px",
                    backgroundColor: "#fff",
                    boxShadow: "0px 2px 2px rgba(223, 226, 235, 0.79)",
                    borderRadius: "10px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minHeight: "64px",
                        padding: "20px 28px",
                        borderBottom: "1px solid #e6e6e6",
                    }}
                >
                    <span
                        style={{
                            fontWeight: "bold",
                        }}
                    >
                        {cart[bagIndex].products.length} products
                    </span>
                    <span
                        onClick={clearCart}
                        style={{
                            fontWeight: "bold",
                            color: "#DE1F36",
                            cursor: "pointer",
                        }}
                    >
                        Clear all
                    </span>
                </div>
                <div
                    className="custom-cart-container"
                    style={{
                        minHeight: "250px",
                        overflow: "auto",
                        maxHeight: "400px",
                    }}
                >
                    {cart[bagIndex].products.map((item, idx) => (
                        <Row
                            key={idx}
                            className="d-flex felx-row align-items-center justify-content-between"
                            style={{
                                height: "100px",
                                padding: "12px 22px",
                                borderBottom: "1px solid #e6e6e6",
                            }}
                        >
                            <Col
                                span={8}
                                className="d-flex felx-row align-items-center justify-content-center"
                            >
                                <Image
                                    width={70}
                                    src={item.image_url}
                                    fallback="data:image/png;base64,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"
                                />
                            </Col>
                            <Col
                                span={16}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                            >
                                <div
                                    className="d-flex flex-column justify-content-between"
                                    style={{
                                        height: "100%",
                                    }}
                                >
                                    <h6>{item.name}</h6>
                                    <div
                                        className=" d-flex flex-row align-items-center justify-content-between"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: "bold",
                                            }}
                                        >
                                            $
                                            {(item.price * item.qty).toFixed(2)}
                                        </span>
                                        <div
                                            className="d-flex flex-row justify-content-center align-items-center"
                                            style={{
                                                marginLeft: 15,
                                            }}
                                        >
                                            <Button
                                                className="d-flex flex-row justify-content-center align-items-center"
                                                shape="circle"
                                                disabled={item.qty === 1}
                                                style={{
                                                    border: "none",
                                                    backgroundColor: "#F8F8F8",
                                                }}
                                                onClick={() =>
                                                    decrementQty(idx)
                                                }
                                                icon={
                                                    <MinusOutlined size={14} />
                                                }
                                            />
                                            <span
                                                style={{
                                                    marginLeft: 6,
                                                    marginRight: 6,
                                                    fontWeight: "bold",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {item.qty}
                                            </span>
                                            <Button
                                                className="d-flex flex-row justify-content-center align-items-center"
                                                shape="circle"
                                                style={{
                                                    border: "none",
                                                    backgroundColor: "#F8F8F8",
                                                }}
                                                onClick={() =>
                                                    incrementQty(idx)
                                                }
                                                icon={
                                                    <PlusOutlined size={14} />
                                                }
                                            />
                                            <Button
                                                style={{
                                                    border: "none",
                                                    marginLeft: 15,
                                                    backgroundColor: "#F8F8F8",
                                                }}
                                                onClick={() =>
                                                    deleteProduct(item.id)
                                                }
                                                className="d-flex flex-row justify-content-center align-items-center"
                                                shape="circle"
                                                icon={
                                                    <DeleteOutlined size={14} />
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    ))}
                </div>

                <Row
                    style={{
                        borderBottom: "1px solid #e6e6e6",
                    }}
                >
                    <Col
                        style={{
                            padding: "0px 12px",
                        }}
                        span={24}
                        className="d-flex flex-column justify-content-between"
                    >
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontWeight: "bold",
                            }}
                        >
                            <span>{t("sub_total")}</span>
                            <span>
                                $
                                {(
                                    total -
                                    cart[bagIndex].tax * 1 -
                                    cart[bagIndex].delivery_fee * 1
                                ).toFixed(2)}
                            </span>
                        </div>
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontWeight: "bold",
                            }}
                        >
                            <span>{t("discount")}</span>
                            <span>$0</span>
                        </div>
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontWeight: "bold",
                            }}
                        >
                            <span>{t("tax")}</span>
                            <span>${cart[bagIndex].tax}</span>
                        </div>
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontWeight: "bold",
                                marginBottom: 10,
                            }}
                        >
                            <span>{t("delivery")}</span>
                            <span>${cart[bagIndex].delivery_fee}</span>
                        </div>
                    </Col>
                </Row>

                <Row
                    style={{
                        marginTop: 10,
                        borderTop: "1px solid #e6e6e6",
                        padding: "10px 0px",
                    }}
                    className="d-flex flex-row justify-content-between align-items-center"
                >
                    <Col
                        span={14}
                        className="d-flex flex-column"
                        style={{
                            padding: "20px 12px",
                        }}
                    >
                        <span
                            style={{
                                fontWeight: "bold",
                                fontSize: "14px",
                            }}
                        >
                            {t("total_amount")}
                        </span>
                        <span
                            style={{
                                fontWeight: "bold",
                                fontSize: "18px",
                            }}
                        >
                            ${total}
                        </span>
                    </Col>
                    <Col span={10}>
                        <button
                            disabled={disable}
                            className="custom-primary-btn"
                            onClick={placeOrder}
                        >
                            {t("place_order")}
                        </button>
                    </Col>
                </Row>
            </div>
        </>
    );
};
