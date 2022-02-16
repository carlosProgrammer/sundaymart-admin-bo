import React from "react";
import PageLayout from "../../../layouts/PageLayout";
import {
    Breadcrumb,
    Radio,
    Layout,
    Card,
    Button,
    PageHeader,
    Typography,
    Table,
    Alert,
    InputNumber,
    Form,
    Select,
    Input,
    DatePicker,
    message,
    Modal,
    MenuTheme,
} from "antd";

const {Text} = Typography;
import {Link} from "react-router-dom";
import clientActive from "../../../requests/Clients/ClientActive";
import addressActive from "../../../requests/Address/AddressActive";
import shopActive from "../../../requests/Shops/ShopActive";
import paymentStatusActive from "../../../requests/PaymentStatusActive";
import orderStatusActive from "../../../requests/OrderStatusActive";
import paymentMethodActive from "../../../requests/PaymentMethodActive";
import productActive from "../../../requests/Products/ProductActive";

const {Content} = Layout;
const {Option} = Select;
const {TextArea} = Input;
import {MinusOutlined, PlusOutlined} from "@ant-design/icons";
import timeUnitActive from "../../../requests/TimeUnits/TimeUnitActive";
import orderSave from "../../../requests/Orders/OrderSave";
import deliveryBoyActive from "../../../requests/DeliveryBoy/DeliveryBoyActive";
import orderGet from "../../../requests/Orders/OrderGet";
import * as moment from "moment";
import {withTranslation} from "react-i18next";
import getActiveShipping from "../../../requests/Shops/GetActiveShopping";
import getActiveShippingTransport from "../../../requests/ShippingTransport/ShippingTransportActive";
import getActiveShippingBox from "../../../requests/ShippingBox/ShippingBoxActive";
import {IS_DEMO} from "../../../global";

class OrderAdd extends React.Component {
    formRef = React.createRef();

    columns = [
        {
            title: "Name",
            dataIndex: "name",
        },
        {
            title: "In stock",
            dataIndex: "in_stock",
        },
        {
            title: "Price",
            dataIndex: "price",
        },
        {
            title: "Discount",
            dataIndex: "discount",
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            render: (quantity, row) => {
                return (
                    <div className="row" style={{width: "200px"}}>
                        <Button
                            type="primary"
                            disabled={
                                quantity === 1 ||
                                quantity === 0 ||
                                row?.is_replaced === 1
                            }
                            icon={<MinusOutlined/>}
                            onClick={() => this.onDecrement(row.id)}
                        />
                        <div className="col col-md-6 col-sm-6">
                            <InputNumber
                                disabled={
                                    quantity === 0 || row?.is_replaced === 1
                                }
                                min={1}
                                max={100000}
                                value={quantity}
                            />
                        </div>
                        <Button
                            disabled={quantity === 0 || row?.is_replaced === 1}
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => this.onIncrement(row.id)}
                        />
                    </div>
                );
            },
        },
        {
            title: "Price total",
            dataIndex: "price_total",
        },
        {
            title: "Discount total",
            dataIndex: "discount_total",
        },
        {
            title: "Total",
            dataIndex: "total",
        },
        {
            title: "Options",
            dataIndex: "options",
            render: (options, row) => {
                return (
                    <>
                        {this.state.order_status < 2 ? (
                            <span>
                                {row.is_replaced !== 1 ? (
                                    <div>
                                        {options?.replace && (
                                            <Button
                                                type="link"
                                                onClick={() =>
                                                    this.replaceProduct(row.id)
                                                }
                                            >
                                                Replace
                                            </Button>
                                        )}
                                        {options.delete && (
                                            <Button
                                                type="link"
                                                className="text-danger"
                                                onClick={() =>
                                                    this.deleteProduct(row.id)
                                                }
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <></>
                                )}
                            </span>
                        ) : (
                            <></>
                        )}
                    </>
                );
            },
        },
    ];

    constructor(props) {
        super(props);

        this.state = {
            showModal: false,
            id_replace_product: -1,
            clients: [],
            client_id: -1,
            addresses: [],
            address_id: -1,
            shops: [],
            shop_id: -1,
            shipping_id: -1,
            shipping_transport_id: -1,
            shipping_box_id: -1,
            delivery_date: "",
            order_statuses: [],
            payment_statuses: [],
            products: [],
            product_details: [],
            payment_methods: [],
            shippings: [],
            shippingTransports: [],
            shippingBoxes: [],
            delivery_boys: [],
            delivery_boy_id: -1,
            time_units: [],
            selected_product: -1,
            total_amount: 0,
            total_discount: 0,
            total: 0,
            delivery_fee: 0,
            order_status: -1,
            payment_status: -1,
            payment_method: -1,
            tax: 0,
            shop_tax: 0,
            id: props.location.state ? props.location.state.id : 0,
            edit: props.location.state ? props.location.state.edit : false,
        };

        this.onChangeClient = this.onChangeClient.bind(this);
        this.onChangeAddress = this.onChangeAddress.bind(this);
        this.onChangeShop = this.onChangeShop.bind(this);
        this.getActiveClient = this.getActiveClient.bind(this);
        this.getActiveShops = this.getActiveShops.bind(this);
        this.getActiveShopping = this.getActiveShopping.bind(this);
        this.getShippingTransport = this.getShippingTransport.bind(this);
        this.getShippingBox = this.getShippingBox.bind(this);
        this.getActiveAddress = this.getActiveAddress.bind(this);
        this.getActiveOrderStatus = this.getActiveOrderStatus.bind(this);
        this.getActivePaymentStatus = this.getActivePaymentStatus.bind(this);
        this.getActivePaymentMethods = this.getActivePaymentMethods.bind(this);
        this.getActiveProducts = this.getActiveProducts.bind(this);
        this.getActiveTimeUnits = this.getActiveTimeUnits.bind(this);
        this.getActiveDeliveryBoys = this.getActiveDeliveryBoys.bind(this);
        this.onChangeProduct = this.onChangeProduct.bind(this);
        this.onChangeDate = this.onChangeDate.bind(this);
        this.onSelectProduct = this.onSelectProduct.bind(this);
        this.onDecrement = this.onDecrement.bind(this);
        this.onIncrement = this.onIncrement.bind(this);
        this.deleteProduct = this.deleteProduct.bind(this);
        this.replaceProduct = this.replaceProduct.bind(this);
        this.handleOk = this.handleOk.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.onChangeShopping = this.onChangeShopping.bind(this);
        this.onChangeShippingTransport =
            this.onChangeShippingTransport.bind(this);
        this.onChangeShippingBox = this.onChangeShippingBox.bind(this);
        this.onChangeOrderStatus = this.onChangeOrderStatus.bind(this);
        this.calculateShipping = this.calculateShipping.bind(this);
        if (this.state.edit) this.getInfoById(this.state.id);

        this.getActiveClient();
        this.getActiveShops();
        this.getActivePaymentStatus();
        this.getActiveOrderStatus();
    }

    deleteProduct = (id) => {
        const prod = this.state.product_details.find((item) => item.id === id);
        const filteredProducts = this.state.product_details.filter(
            (item) => item.id !== id
        );
        const productDetails = filteredProducts.filter(
            (item) => item.id !== prod.id_replace_product
        );


        this.setState({
            product_details: productDetails.map((item) => {
                if (item.id_replace_product === id) {
                    return {
                        ...item,
                        id_replace_product: null,
                    };
                } else {
                    return item;
                }
            }),
        });
        let total_amount = productDetails
            .reduce((acc, curr) => {
                if (curr.is_replaced == 1) return acc * 1;
                else
                    return acc * 1 + curr.price_total * 1;
            }, 0)
            .toFixed(2);
        let total_discount = productDetails
            .reduce((acc, curr) => {
                if (curr.is_replaced == 1) return acc * 1;
                else
                    return acc * 1 + curr.discount_total * 1;
            }, 0)
            .toFixed(2);
        var tax_total = productDetails
            .reduce((acc, curr) => {
                if (curr.is_replaced == 1) return acc * 1;
                else
                    return acc * 1 + curr.tax * curr.quantity;
            }, 0)
            .toFixed(2);

        this.setState({
            total_amount: total_amount,
            total_discount: total_discount,
            total: (total_amount * 1 + tax_total * 1 - total_discount * 1 + this.state.delivery_fee * 1).toFixed(2),
            tax: tax_total
        });

        this.setShopTax((total_amount - total_discount).toFixed(2));
    };

    replaceProduct = (id) => {
        this.setState({
            showModal: true,
            id_replace_product: id,
        });
    };

    handleOk = () => {
        let index = this.state.products.findIndex(
            (val) => val.id === this.state.selected_product
        );
        let replacedIndex = this.state.product_details.findIndex(
            (val) => val.id === this.state.id_replace_product
        );
        const idx = this.state.product_details.findIndex(
            (item) => item.id === this.state.selected_product
        );
        if (idx < 0) {
            const replaceProducts = this.state.product_details.map((item) => {
                if (item.id === this.state.id_replace_product) {
                    return {
                        ...item,
                        is_replaced: 1,
                        id_replace_product: null,
                    };
                } else {
                    return item;
                }
            });


            if (index > -1) {
                let product = this.state.products[index];

                let productTax =
                    ((product.price -
                        (product.discount_type === 0
                            ? 0
                            : product.discount_type === 1
                                ? (product.discount_amount * product.price) / 100
                                : product.discount_amount)) *
                        product?.taxes.reduce(
                            (previousValue, currentValue) =>
                                previousValue + currentValue?.percent,
                            0
                        )) /
                    100;

                let productObject = {
                    id: this.state.selected_product,
                    name: product.name,
                    price: product.price,
                    tax: productTax.toFixed(2),
                    in_stock: product.quantity,
                    discount: (product.discount_type === 0
                            ? 0
                            : product.discount_type === 1
                                ? (product.discount_amount * product.price) / 100
                                : product.discount_amount * 1
                    ).toFixed(2),
                    price_total: (
                        product.price *
                        this.state.product_details[replacedIndex].quantity
                    ).toFixed(2),
                    discount_total: ((product.discount_type === 0
                            ? 0
                            : product.discount_type === 1
                                ? (product.discount_amount * product.price) / 100
                                : product.discount_amount * 1) *
                        this.state.product_details[replacedIndex].quantity
                    ).toFixed(2),
                    total: (
                        (product.price -
                            (product.discount_type === 0
                                ? 0
                                : product.discount_type === 1
                                    ? (
                                        (product.discount_amount *
                                            product.price) /
                                        100
                                    ).toFixed(2)
                                    : product.discount_amount * 1)) *
                        this.state.product_details[replacedIndex]?.quantity
                    ).toFixed(2),
                    quantity:
                    this.state.product_details[replacedIndex]?.quantity,
                    is_replaced: null,
                    id_replace_product: this.state.id_replace_product,
                    options: {
                        delete: 1,
                    },
                };

                replaceProducts.push(productObject);
                this.setState({
                    product_details: replaceProducts,
                });
                let total_amount = replaceProducts
                    .reduce((acc, curr) => {
                        if (curr.is_replaced == 1) return acc * 1;
                        else
                            return acc * 1 + curr.price_total * 1;
                    }, 0)
                    .toFixed(2);
                let total_discount = replaceProducts
                    .reduce((acc, curr) => {
                        if (curr.is_replaced == 1) return acc * 1;
                        else
                            return acc * 1 + curr.discount_total * 1;
                    }, 0)
                    .toFixed(2);
                var total_tax = replaceProducts
                    .reduce((acc, curr) => {
                        if (curr.is_replaced == 1) return acc * 1;
                        else
                            return acc * 1 + curr.tax * curr.quantity;
                    }, 0)
                    .toFixed(2);

                this.setState({
                    total_amount: total_amount,
                    total_discount: total_discount,
                    total: (total_amount * 1 - total_discount * 1 + this.state.delivery_fee * 1 + total_tax * 1).toFixed(2),
                    showModal: false,
                    tax: total_tax
                });

                this.setShopTax((total_amount - total_discount).toFixed(2));

                this.formRef.current.setFieldsValue({
                    total_amount: total_amount,
                    total_discount: total_discount,
                });
            }
        } else {
            message.warn(
                "This product already exist! Please choose another product"
            );
        }
    };

    setShopTax = (amount) => {
        var index = this.state.shops.findIndex((item) => item['id'] == this.state.shop_id);
        if (index > -1) {
            var tax = this.state.shops[index].taxes.reduce(
                (previousValue, currentValue) =>
                    previousValue + currentValue?.percent,
                0
            );

            var shopTax = ((amount * tax) / 100).toFixed(2);

            this.setState({
                shop_tax: shopTax
            });
        }
    }

    handleCancel = () => {
        this.setState({
            showModal: false,
        });
    };

    getInfoById = async (id) => {
        let data = await orderGet(id);
        if (data.data.success) {
            let order = data.data.data;
            let order_comment = data.data.data["comment"];
            let order_detail = data.data.data["details"];

            this.getActiveProducts(order.id_shop);
            this.getActiveTimeUnits(order.id_shop);
            this.getActiveShopping(order.id_shop);
            this.getActiveDeliveryBoys(order.id_shop);
            this.getShippingBox(order.id_shop);
            this.getShippingTransport(order.id_shop);
            this.getActiveShopping(order.id_shop);
            this.getActivePaymentMethods(order.id_shop);
            this.getActiveAddress(order.id_user);

            var product_detail = this.state.product_details;
            var total_amount = 0;
            var total_discount = 0;
            var total = 0;

            for (let i = 0; i < order_detail.length; i++) {
                var productObject = {
                    id: order_detail[i].id_product,
                    name: order_detail[i].name,
                    price: order_detail[i].price,
                    in_stock: order_detail[i].product_quantity,
                    discount: order_detail[i].discount,
                    price_total: +(
                        order_detail[i].price * order_detail[i].quantity
                    ).toFixed(2),
                    discount_total: +(
                        order_detail[i].discount * order_detail[i].quantity
                    ).toFixed(2),
                    total: +(
                        (order_detail[i].price - order_detail[i].discount) *
                        order_detail[i].quantity
                    ).toFixed(2),
                    quantity: order_detail[i].quantity,
                    is_replaced: order_detail[i]?.is_replaced,
                    id_replace_product: order_detail[i]?.id_replace_product,
                    options: {
                        replace: order_detail[i]?.is_replaced !== 1 && 1,
                        delete: order_detail[i]?.is_replaced !== 1 && 1,
                    },
                };

                total_amount += productObject.price_total;
                total_discount += productObject.discount_total;
                total += productObject.total;

                product_detail.push(productObject);
            }

            total += parseFloat(order.delivery_fee);
            total += parseFloat(order.tax);
            total = parseFloat(total).toFixed(2);
            total_amount = parseFloat(total_amount).toFixed(2);
            total_discount = parseFloat(total_discount).toFixed(2);

            this.formRef.current.setFieldsValue({
                client: order.id_user,
                address: order.id_delivery_address,
                shop: order.id_shop,
                order_status: order.order_status,
                payment_status: order.payment_status,
                payment_method: order.payment_method,
                delivery_type: order.type + "",
                delivery_boy_comment: order.comment,
                delivery_boy: order.delivery_boy,
                delivery_time: order.delivery_time_id,
                delivery_date: moment(order.delivery_date, "YYYY-MM-DD"),
                total_amount: total_amount,
                total_discount: total_discount,
            });

            this.setState({
                shipping_id: order?.shipping_id,
                shipping_transport_id: order?.shipping_transport_id,
                shipping_box_id: order?.shipping_box_id,
                order_status: order.order_status,
                payment_status: order.payment_status,
                payment_method: order.payment_method,
                client_id: order.id_user,
                address_id: order.id_delivery_address,
                shop_id: order.id_shop,
                delivery_boy_id: order.delivery_boy,
                delivery_fee: order.delivery_fee,
                tax: order.tax,
                delivery_date: order.delivery_date,
                product_details: product_detail,
                total_amount: total_amount,
                total_discount: total_discount,
                total: total,
            });
        }
    };

    onDecrement = (id) => {
        var index = this.state.product_details.findIndex(
            (val) => val.id === id
        );
        if (index > -1) {
            var product_details = this.state.product_details;
            if (product_details[index].quantity > 1) {
                product_details[index].quantity -= 1;
                product_details[index].price_total = (
                    product_details[index].price *
                    product_details[index].quantity
                ).toFixed(2);
                product_details[index].discount_total = (
                    product_details[index].discount *
                    product_details[index].quantity
                ).toFixed(2);
                product_details[index].total = (
                    (product_details[index].price -
                        product_details[index].discount) *
                    product_details[index].quantity
                ).toFixed(2);

                var total_amount = (
                    this.state.total_amount * 1 -
                    product_details[index].price * 1
                ).toFixed(2);
                var total_discount = (
                    this.state.total_discount * 1 -
                    product_details[index].discount * 1
                ).toFixed(2);

                var tax_total = (this.state.tax * 1 - product_details[index].tax * 1).toFixed(2);

                this.setState({
                    product_details: product_details,
                    total_amount: total_amount,
                    total_discount: total_discount,
                    total: (total_amount * 1 - total_discount * 1 + tax_total * 1 + this.state.delivery_fee * 1).toFixed(2),
                    tax: tax_total
                });

                this.setShopTax((total_amount - total_discount).toFixed(2));

                this.formRef.current.setFieldsValue({
                    total_amount: this.state.total_amount,
                    total_discount: this.state.total_discount,
                });
            }
        }
    };

    onIncrement = (id) => {
        var index = this.state.product_details.findIndex(
            (val) => val.id === id
        );

        if (index > -1) {
            var product_details = this.state.product_details;

            product_details[index].quantity += 1;
            product_details[index].price_total = (
                product_details[index].price * product_details[index].quantity
            ).toFixed(2);
            product_details[index].discount_total = (
                product_details[index].discount *
                product_details[index].quantity
            ).toFixed(2);
            product_details[index].total = (
                (product_details[index].price -
                    product_details[index].discount) *
                product_details[index].quantity
            ).toFixed(2);

            var total_amount = (
                this.state.total_amount * 1 +
                product_details[index].price * 1
            ).toFixed(2);
            var total_discount = (
                this.state.total_discount * 1 +
                product_details[index].discount * 1
            ).toFixed(2);

            var tax_total = (this.state.tax * 1 + product_details[index].tax * 1).toFixed(2);

            this.setState({
                product_details: product_details,
                total_amount: total_amount,
                total_discount: total_discount,
                total: (total_amount * 1 - total_discount * 1 + tax_total * 1 + this.state.delivery_fee * 1).toFixed(2),
                tax: tax_total
            });

            this.setShopTax((total_amount - total_discount).toFixed(2));

            this.formRef.current.setFieldsValue({
                total_amount: total_amount,
                total_discount: total_discount,
            });
        }
    };

    onSelectProduct = () => {
        var index = this.state.products.findIndex(
            (val) => val.id === this.state.selected_product
        );
        if (index > -1) {
            var product = this.state.products[index];

            let productTax =
                ((product.price -
                    (product.discount_type === 0
                        ? 0
                        : product.discount_type === 1
                            ? (product.discount_amount * product.price) / 100
                            : product.discount_amount)) *
                    product?.taxes.reduce(
                        (previousValue, currentValue) =>
                            previousValue + currentValue?.percent,
                        0
                    )) /
                100;

            var productObject = {
                id: this.state.selected_product,
                name: product.name,
                price: product.price,
                tax: productTax.toFixed(2),
                in_stock: product.quantity,
                discount:
                    product.discount_type === 0
                        ? 0
                        : product.discount_type === 1
                        ? (product.discount_amount * product.price) / 100
                        : product.discount_amount,
                price_total: product.price,
                discount_total:
                    (product.discount_type === 0
                        ? 0
                        : product.discount_type === 1
                            ? (product.discount_amount * product.price) / 100
                            : product.discount_amount * 1).toFixed(2),
                total:
                    (product.price -
                        (product.discount_type === 0
                            ? 0
                            : product.discount_type === 1
                                ? (product.discount_amount * product.price) / 100
                                : product.discount_amount * 1)).toFixed(2),
                quantity: 1,
                options: {
                    replace: 1,
                    delete: 1,
                },
            };

            const idx = this.state.product_details.findIndex(
                (item) => item.id === this.state.selected_product
            );

            if (idx < 0) {
                this.setState({
                    product_details: [
                        ...this.state.product_details,
                        productObject,
                    ],
                });

                var total_amount =
                    this.state.total_amount * 1 + productObject.price_total * 1;
                var total_tax = this.state.tax * 1 + productTax;
                var total_discount =
                    this.state.total_discount * 1 +
                    productObject.discount_total * 1;

                this.setState({
                    total_amount: total_amount.toFixed(2),
                    total_discount: total_discount.toFixed(2),
                    total: (
                        total_amount.toFixed(2) * 1 - total_discount.toFixed(2) * 1 +
                        total_tax + this.state.delivery_fee * 1
                    ).toFixed(2),
                    tax: total_tax.toFixed(2),
                });

                this.setShopTax((total_amount - total_discount).toFixed(2));

                this.formRef.current.setFieldsValue({
                    total_amount: total_amount.toFixed(2),
                    total_discount: total_discount.toFixed(2),
                });
                this.setState({
                    selected_product: -1,
                });
            } else {
                message.warn(
                    "This product already exist! Please choose another product"
                );
            }
        }
    };

    getActiveShops = async () => {
        let data = await shopActive();
        if (data.data.success == 1 && data.data.data.length > 0) {
            if (this.state.edit)
                this.setState({
                    shops: data.data.data,
                });
            else {
                this.setState({
                    shops: data.data.data,
                    shop_id: data.data.data[0].id,
                    delivery_fee: 0,
                    tax: 0,
                });

                this.getActiveProducts(data.data.data[0].id);
                this.getActiveTimeUnits(data.data.data[0].id);
                this.getActiveDeliveryBoys(data.data.data[0].id);
                this.getActivePaymentMethods(data.data.data[0].id);
                this.getShippingTransport(data.data.data[0].id);
                this.getShippingBox(data.data.data[0].id);
                this.getActiveShopping(data.data.data[0].id);
            }

            if (this.formRef.current != null && !this.state.edit)
                this.formRef.current.setFieldsValue({
                    shop: data.data.data[0].id,
                });
        }
    };

    getActiveShopping = async (id) => {
        let data = await getActiveShipping(id);
        if (data.data.data.length > 0) {
            this.setState({
                shippings: data.data.data.map((item) => ({
                    id: item.id,
                    name: item?.delivery_type?.name,
                    price: item.amount
                })),
            });
        } else {
            this.setState({
                shippings: []
            });
        }
    };

    getShippingTransport = async (id) => {
        let data = await getActiveShippingTransport(id);
        if (data.data.data.length > 0) {
            this.setState({
                shippingTransports: data.data.data.map((item) => ({
                    id: item.id,
                    name: item?.delivery_transport?.name,
                    price: item.price
                })),
            });
        } else {
            this.setState({
                shippingTransports: []
            });
        }
    };

    getShippingBox = async (id) => {
        let data = await getActiveShippingBox(id);
        if (data.data.data.length > 0) {
            this.setState({
                shippingBoxes: data.data.data.map((item) => ({
                    id: item.id,
                    name: item?.shipping_box?.name,
                    price: item.price
                })),
            });
        } else {
            this.setState({
                shippingBoxes: []
            });
        }
    };

    getActiveDeliveryBoys = async (shop_id) => {
        let data = await deliveryBoyActive(shop_id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                delivery_boys: data.data.data,
            });

            if (this.formRef.current != null)
                this.formRef.current.setFieldsValue({
                    delivery_boy:
                        this.state.delivery_boy_id > 0
                            ? this.state.delivery_boy_id
                            : data.data.data[0].id,
                });
        }
    };

    getActiveTimeUnits = async (shop_id) => {
        let data = await timeUnitActive(shop_id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                time_units: data.data.data,
            });
        }
    };

    getActiveClient = async () => {
        let data = await clientActive();
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                clients: data.data.data,
            });

            if (this.formRef.current != null)
                this.formRef.current.setFieldsValue({
                    client:
                        this.state.client_id > 0
                            ? this.state.client_id
                            : data.data.data[0].id,
                });
        }
    };

    getActiveProducts = async (shop_id) => {
        let data = await productActive(shop_id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                products: data.data.data,
            });
        }
    };

    getActivePaymentStatus = async () => {
        let data = await paymentStatusActive();
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                payment_statuses: data.data.data,
            });

            if (this.formRef.current != null)
                this.formRef.current.setFieldsValue({
                    payment_status:
                        this.state.payment_status > 0
                            ? this.state.payment_status
                            : data.data.data[0].id,
                });
        }
    };

    getActivePaymentMethods = async (shop_id) => {
        let data = await paymentMethodActive(shop_id);
        if (data.data.data.length > 0) {
            this.setState({
                payment_methods: data.data.data,
            });

            if (this.formRef.current != null)
                this.formRef.current.setFieldsValue({
                    payment_method:
                        this.state.payment_method > 0
                            ? this.state.payment_method
                            : data.data.data[0].id,
                });
        }
    };

    getActiveOrderStatus = async () => {
        let data = await orderStatusActive();
        if (data.data.success == 1 && data.data.data.length > 0) {
            this.setState({
                order_statuses: data.data.data,
            });

            if (this.formRef.current != null)
                this.formRef.current.setFieldsValue({
                    order_status:
                        this.state.order_status > 0
                            ? this.state.order_status
                            : data.data.data[0].id,
                });
        }
    };

    getActiveAddress = async (client_id) => {
        let data = await addressActive(client_id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            if (this.state.edit)
                this.setState({
                    addresses: data.data.data,
                });
            else {
                this.setState({
                    addresses: data.data.data,
                    address_id:
                        this.state.address_id > 0
                            ? this.state.address_id
                            : data.data.data[0].id,
                });

                this.formRef.current.setFieldsValue({
                    address:
                        this.state.address_id > 0
                            ? this.state.address_id
                            : data.data.data[0].id,
                });
            }
        }
    };

    onChangeClient(e) {
        this.setState({
            client_id: e,
        });

        this.getActiveAddress(e);
    }

    onChangeDate = (value, dateString) => {
        this.setState({
            delivery_date: dateString,
        });
    };

    onChangeAddress(e) {
        this.setState({
            address_id: e,
        });
    }

    onChangeProduct(e) {
        this.setState({
            selected_product: e,
        });
    }

    onChangeShop(e) {
        this.setState({
            shop_id: e,
        });

        var index = this.state.shops.findIndex((val) => val.id === e);
        if (index > -1)
            this.setState({
                delivery_fee: 0,
                tax: 0,
                product_details: [],
                total_amount: 0,
                total_discount: 0,
                total: 0,
                shop_tax: 0
            });

        this.getActiveProducts(e);
        this.getActiveTimeUnits(e);
        this.getActiveDeliveryBoys(e);
        this.getActiveShopping(e);
        this.getShippingBox(e);
        this.getShippingTransport(e);
        this.getActivePaymentMethods(e);
    }

    onChangeShopping(e) {
        this.setState({
            shipping_id: e,
        });

        this.calculateShipping(e, this.state.shipping_box_id, this.state.shipping_transport_id);
    }

    onChangeShippingTransport(e) {
        this.setState({
            shipping_transport_id: e,
        });

        this.calculateShipping(this.state.shipping_id, this.state.shipping_box_id, e);
    }

    onChangeShippingBox(e) {
        this.setState({
            shipping_box_id: e,
        });

        this.calculateShipping(this.state.shipping_id, e, this.state.shipping_transport_id);
    }

    calculateShipping(shipping_id, shipping_box_id, shipping_transport_id) {
        var index = this.state.shippings.findIndex((item) => item.id == shipping_id);
        var price = index !== -1 ? this.state.shippings[index].price * 1 : 0;

        var index2 = this.state.shippingBoxes.findIndex((element) => element.id == shipping_box_id);
        var price2 = index2 !== -1 ? this.state.shippingBoxes[index2].price * 1 : 0;

        var index3 = this.state.shippingTransports.findIndex((item) => item.id == shipping_transport_id);
        var price3 = index3 !== -1 ? this.state.shippingTransports[index3].price * 1 : 0;

        this.setState({
            delivery_fee: price + price3 + price2,
        });
    }

    onFinish = async (values) => {
        const {t} = this.props;

        if (IS_DEMO) {
            message.warn("You cannot save in demo mode");
            return;
        }

        let data = await orderSave(values, this.state, this.state.id);

        if(!data.data.success) {
            message.error(data.data.message);
            return false;
        }

        if(data.data.data != null && data.data.data.missed_products != null && data.data.data.missed_products.length > 0) {
            message.error(t("out_of_stock"));
            return false;
        }

        if (data.data.success == 1) window.history.back();
    };

    onFinishFailed = (errorInfo) => {
    };
    onChangeOrderStatus = (e) => {
        this.setState({
            order_status: e,
        });
    };

    render() {
        const {t} = this.props;
        return (
            <PageLayout>
                <Breadcrumb style={{margin: "16px 0"}}>
                    <Breadcrumb.Item>
                        <Link to="/orders" className="nav-text">
                            {t("orders")}
                        </Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        {this.state.edit ? t("edit") : t("add")}
                    </Breadcrumb.Item>
                </Breadcrumb>
                <PageHeader className="site-page-header" title={t("orders")}>
                    <Content className="site-layout-background">
                        <Form
                            ref={this.formRef}
                            name="basic"
                            initialValues={{
                                total_amount: 0,
                                total_discount: 0,
                                delivery_type: "1",
                                client: this.state.client_id,
                            }}
                            layout="vertical"
                            onFinish={this.onFinish}
                            onFinishFailed={this.onFinishFailed}
                        >
                            <div className="row">
                                <div className="col-md-6 col-sm-12">
                                    <Card
                                        title={t("client_info")}
                                        type="inner"
                                        size="small"
                                    >
                                        <div className="row">
                                            <div className="col-md-9 col-sm-12">
                                                <Form.Item
                                                    label={t("clients")}
                                                    name="client"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message:
                                                                t(
                                                                    "missing_client"
                                                                ),
                                                        },
                                                    ]}
                                                    tooltip={"select_client"}
                                                >
                                                    <Select
                                                        placeholder={
                                                            "select_client"
                                                        }
                                                        onChange={
                                                            this.onChangeClient
                                                        }
                                                    >
                                                        {this.state.clients.map(
                                                            (item) => {
                                                                return (
                                                                    <Option
                                                                        value={
                                                                            item.id
                                                                        }
                                                                        key={
                                                                            item.id
                                                                        }
                                                                    >
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </Option>
                                                                );
                                                            }
                                                        )}
                                                    </Select>
                                                </Form.Item>
                                            </div>
                                            <div className="col-md-3 col-sm-12">
                                                <Link
                                                    className="btn btn-success"
                                                    to="/clients/add"
                                                    style={{
                                                        marginTop: "30px",
                                                    }}
                                                >
                                                    {t("add_client")}
                                                </Link>
                                            </div>
                                            {this.state.client_id > 0 && (
                                                <>
                                                    <div className="col-md-9 col-sm-12">
                                                        <Form.Item
                                                            label={t("address")}
                                                            name="address"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        t(
                                                                            "missing_address"
                                                                        ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "select_address"
                                                            )}
                                                        >
                                                            <Select
                                                                placeholder={t(
                                                                    "select_address"
                                                                )}
                                                                onChange={
                                                                    this
                                                                        .onChangeAddress
                                                                }
                                                            >
                                                                {this.state.addresses.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.address
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-3 col-sm-12">
                                                        <Link
                                                            className="btn btn-success"
                                                            to={{
                                                                pathname:
                                                                    "/client-addresses/add",
                                                                state: {
                                                                    client_id:
                                                                    this
                                                                        .state
                                                                        .client_id,
                                                                },
                                                            }}
                                                            style={{
                                                                marginTop:
                                                                    "30px",
                                                            }}
                                                        >
                                                            {t(
                                                                "add_new_address"
                                                            )}
                                                        </Link>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                                {this.state.address_id > 0 && (
                                    <>
                                        <div className="col-md-6 col-sm-12">
                                            <Card
                                                title={t("shop_info")}
                                                type="inner"
                                                size="small"
                                            >
                                                <div className="col-md-6 col-sm-12">
                                                    <Form.Item
                                                        label={t("shops")}
                                                        name="shop"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message:
                                                                    t(
                                                                        "missing_shop"
                                                                    ),
                                                            },
                                                        ]}
                                                        tooltip={t(
                                                            "select_shop"
                                                        )}
                                                    >
                                                        <Select
                                                            placeholder={t(
                                                                "select_shop"
                                                            )}
                                                            onChange={
                                                                this
                                                                    .onChangeShop
                                                            }
                                                        >
                                                            {this.state.shops.map(
                                                                (item) => {
                                                                    return (
                                                                        <Option
                                                                            value={
                                                                                item.id
                                                                            }
                                                                            key={
                                                                                item.id
                                                                            }
                                                                        >
                                                                            {
                                                                                item.name
                                                                            }
                                                                        </Option>
                                                                    );
                                                                }
                                                            )}
                                                        </Select>
                                                    </Form.Item>
                                                </div>
                                            </Card>
                                        </div>
                                        <div
                                            className="col-md-6 col-sm-12"
                                            style={{marginTop: "30px"}}
                                        >
                                            <Card
                                                title={t("order_info")}
                                                type="inner"
                                                size="small"
                                            >
                                                <div className="row">
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "total_amount"
                                                            )}
                                                            name="total_amount"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        "missing_total_amount"
                                                                    ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "enter_total_amount"
                                                            )}
                                                        >
                                                            <Input
                                                                placeholder={t(
                                                                    "total_amount"
                                                                )}
                                                                disabled
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "total_discount"
                                                            )}
                                                            name="total_discount"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        "missing_total_discount"
                                                                    ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "enter_total_discount"
                                                            )}
                                                        >
                                                            <Input
                                                                placeholder={t(
                                                                    "total_discount"
                                                                )}
                                                                disabled
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "order_status"
                                                            )}
                                                            name="order_status"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        "missing_order_status"
                                                                    ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "select_order_status"
                                                            )}
                                                        >
                                                            <Select
                                                                placeholder={t(
                                                                    "select_order_status"
                                                                )}
                                                                onChange={
                                                                    this
                                                                        .onChangeOrderStatus
                                                                }
                                                            >
                                                                {this.state.order_statuses.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "payment_status"
                                                            )}
                                                            name="payment_status"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        "missing_payment_status"
                                                                    ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "select_payment_status"
                                                            )}
                                                        >
                                                            <Select
                                                                placeholder={t(
                                                                    "select_payment_status"
                                                                )}
                                                            >
                                                                {this.state.payment_statuses.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "payment_method"
                                                            )}
                                                            name="payment_method"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        "missing_payment_method"
                                                                    ),
                                                                },
                                                            ]}
                                                            tooltip={t(
                                                                "select_payment_method"
                                                            )}
                                                        >
                                                            <Select
                                                                placeholder={t(
                                                                    "select_payment_method"
                                                                )}
                                                            >
                                                                {this.state.payment_methods.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.payment.language.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "orders_comment"
                                                            )}
                                                            name="order_comment"
                                                            tooltip={
                                                                "enter_orders_comment"
                                                            }
                                                        >
                                                            <TextArea
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                        <div
                                            className="col-md-6 col-sm-12"
                                            style={{marginTop: "30px"}}
                                        >
                                            <Card
                                                title={t("delivery_info")}
                                                type="inner"
                                                size="small"
                                            >
                                                <div className="row">
                                                    <div className="col-md-4 col-sm-12">
                                                        <Form.Item
                                                            name="delivery_type"
                                                            label={t(
                                                                "delivery_type"
                                                            )}
                                                            tooltip={t(
                                                                "enter_shop_delivery_type"
                                                            )}
                                                        >
                                                            <Radio.Group>
                                                                <Radio value="1">
                                                                    {t(
                                                                        "delivery"
                                                                    )}
                                                                </Radio>
                                                                <Radio value="2">
                                                                    {t(
                                                                        "pickup"
                                                                    )}
                                                                </Radio>
                                                            </Radio.Group>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-8 col-sm-12">
                                                        <div className="row">
                                                            <div className="col-md-6 col-sm-12">
                                                                <Form.Item
                                                                    name="delivery_date"
                                                                    label={t(
                                                                        "delivery_date"
                                                                    )}
                                                                    tooltip={t(
                                                                        "enter_order_delivery_date"
                                                                    )}
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                t(
                                                                                    "missing _order_delivery_date"
                                                                                ),
                                                                        },
                                                                    ]}
                                                                >
                                                                    <DatePicker
                                                                        onChange={
                                                                            this
                                                                                .onChangeDate
                                                                        }
                                                                    />
                                                                </Form.Item>
                                                            </div>
                                                            <div className="col-md-6 col-sm-12">
                                                                <Form.Item
                                                                    label={t(
                                                                        "delivery_time"
                                                                    )}
                                                                    name="delivery_time"
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                t(
                                                                                    "missing_delivery_time"
                                                                                ),
                                                                        },
                                                                    ]}
                                                                    tooltip={
                                                                        t("select_delivery_time")
                                                                    }
                                                                >
                                                                    <Select
                                                                        placeholder={t(
                                                                            "select_delivery_time"
                                                                        )}
                                                                    >
                                                                        {this.state.time_units.map(
                                                                            (
                                                                                item
                                                                            ) => {
                                                                                return (
                                                                                    <Option
                                                                                        value={
                                                                                            item.id
                                                                                        }
                                                                                        key={
                                                                                            item.id
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            item.name
                                                                                        }
                                                                                    </Option>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </Select>
                                                                </Form.Item>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "delivery_boy"
                                                            )}
                                                            name="delivery_boy"
                                                            tooltip={t(
                                                                "select_delivery_boy"
                                                            )}
                                                        >
                                                            <Select
                                                                placeholder={t(
                                                                    "select_delivery_boy"
                                                                )}
                                                            >
                                                                {this.state.delivery_boys.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }{" "}
                                                                                {
                                                                                    item.surname
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t("shipping_type")}
                                                            name="shipping_id"
                                                            tooltip={t("select_shipping_type")}
                                                        >
                                                            <Select
                                                                placeholder={t("select_shipping_type")}
                                                                value={
                                                                    this.state
                                                                        .shipping_id
                                                                }
                                                                onChange={
                                                                    this
                                                                        .onChangeShopping
                                                                }
                                                            >
                                                                {this.state?.shippings.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t("shipping_transport")}
                                                            name="shipping_transport_id"
                                                            tooltip={t("select_shipping_transport")}
                                                        >
                                                            <Select
                                                                placeholder={t("select_shipping_transport")}
                                                                value={
                                                                    this.state
                                                                        .shipping_transport_id
                                                                }
                                                                onChange={
                                                                    this
                                                                        .onChangeShippingTransport
                                                                }
                                                            >
                                                                {this.state?.shippingTransports.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t("shipping_box_type")}
                                                            name="shipping_box_id"
                                                            tooltip={t("select_shipping_box_type")}
                                                        >
                                                            <Select
                                                                placeholder={t("select_shipping_box_type")}
                                                                value={
                                                                    this.state
                                                                        .shipping_box_id
                                                                }
                                                                onChange={
                                                                    this
                                                                        .onChangeShippingBox
                                                                }
                                                            >
                                                                {this.state?.shippingBoxes.map(
                                                                    (item) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                        </Form.Item>
                                                    </div>
                                                    <div className="col-md-6 col-sm-12">
                                                        <Form.Item
                                                            label={t(
                                                                "delivery_boys_comment"
                                                            )}
                                                            name="delivery_boy_comment"
                                                            tooltip={t(
                                                                "enter_delivery_boys_comment"
                                                            )}
                                                        >
                                                            <TextArea
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                        <div
                                            className="col-md-12 col-sm-12"
                                            style={{marginTop: "30px"}}
                                        >
                                            <Card
                                                title={t("order_detail_info")}
                                                extra={
                                                    this.state.order_status <
                                                    2 ? (
                                                        <div
                                                            className="row"
                                                            style={{
                                                                marginRight:
                                                                    "10px",
                                                            }}
                                                        >
                                                            <Select
                                                                showSearch
                                                                style={{
                                                                    minWidth:
                                                                        "150px",
                                                                    maxWidth:
                                                                        "700px",
                                                                }}
                                                                onChange={
                                                                    this
                                                                        .onChangeProduct
                                                                }
                                                                optionFilterProp="children"
                                                                filterOption={(
                                                                    input,
                                                                    option
                                                                ) =>
                                                                    option.children
                                                                        .toLowerCase()
                                                                        .indexOf(
                                                                            input.toLowerCase()
                                                                        ) >= 0
                                                                }
                                                                placeholder={t(
                                                                    "select_product"
                                                                )}
                                                            >
                                                                {this.state.products.map(
                                                                    (
                                                                        item,
                                                                        idx
                                                                    ) => {
                                                                        return (
                                                                            <Option
                                                                                value={
                                                                                    item.id
                                                                                }
                                                                                key={`${
                                                                                    idx +
                                                                                    1
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </Option>
                                                                        );
                                                                    }
                                                                )}
                                                            </Select>
                                                            <Button
                                                                className="btn-success"
                                                                onClick={
                                                                    this
                                                                        .onSelectProduct
                                                                }
                                                                style={{
                                                                    marginLeft:
                                                                        "10px",
                                                                }}
                                                            >
                                                                {t(
                                                                    "add_product"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <></>
                                                    )
                                                }
                                                type="inner"
                                                size="small"
                                            >
                                                {this.state.product_details
                                                    .length > 0 ? (
                                                    <>
                                                        <Form.Item>
                                                            <Table
                                                                rowClassName={(
                                                                    record,
                                                                    index
                                                                ) =>
                                                                    record.is_replaced ===
                                                                    1
                                                                        ? "replace-row"
                                                                        : record.id_replace_product &&
                                                                        "new-row"
                                                                }
                                                                pagination={
                                                                    false
                                                                }
                                                                dataSource={
                                                                    this.state
                                                                        .product_details
                                                                }
                                                                columns={
                                                                    this.columns
                                                                }
                                                                rowKey="id"
                                                                summary={(
                                                                    pageData
                                                                ) => {
                                                                    return (
                                                                        <>
                                                                            <Table.Summary.Row>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        6
                                                                                    }
                                                                                ></Table.Summary.Cell>
                                                                                <Table.Summary.Cell>
                                                                                    {t(
                                                                                        "price_total"
                                                                                    )}
                                                                                </Table.Summary.Cell>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    <Text type="danger">
                                                                                        {
                                                                                            this
                                                                                                .state
                                                                                                .total_amount
                                                                                        }
                                                                                    </Text>
                                                                                </Table.Summary.Cell>
                                                                            </Table.Summary.Row>
                                                                            <Table.Summary.Row>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        6
                                                                                    }
                                                                                ></Table.Summary.Cell>
                                                                                <Table.Summary.Cell>
                                                                                    {t(
                                                                                        "discount_total"
                                                                                    )}
                                                                                </Table.Summary.Cell>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    <Text type="danger">
                                                                                        {
                                                                                            this
                                                                                                .state
                                                                                                .total_discount
                                                                                        }
                                                                                    </Text>
                                                                                </Table.Summary.Cell>
                                                                            </Table.Summary.Row>
                                                                            <Table.Summary.Row>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        6
                                                                                    }
                                                                                ></Table.Summary.Cell>
                                                                                <Table.Summary.Cell>
                                                                                    {t(
                                                                                        "tax"
                                                                                    )}
                                                                                </Table.Summary.Cell>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    <Text type="danger">
                                                                                        {
                                                                                            (this
                                                                                                .state
                                                                                                .tax * 1 + this.state.shop_tax * 1).toFixed(2)
                                                                                        }
                                                                                    </Text>
                                                                                </Table.Summary.Cell>
                                                                            </Table.Summary.Row>
                                                                            <Table.Summary.Row>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        6
                                                                                    }
                                                                                ></Table.Summary.Cell>
                                                                                <Table.Summary.Cell>
                                                                                    {t(
                                                                                        "delivery_fee"
                                                                                    )}
                                                                                </Table.Summary.Cell>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    <Text type="danger">
                                                                                        {
                                                                                            this
                                                                                                .state
                                                                                                .delivery_fee
                                                                                        }
                                                                                    </Text>
                                                                                </Table.Summary.Cell>
                                                                            </Table.Summary.Row>

                                                                            <Table.Summary.Row>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        6
                                                                                    }
                                                                                ></Table.Summary.Cell>
                                                                                <Table.Summary.Cell>
                                                                                    {t(
                                                                                        "amount_to_pay"
                                                                                    )}
                                                                                </Table.Summary.Cell>
                                                                                <Table.Summary.Cell
                                                                                    colSpan={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    <Text type="danger">
                                                                                        {
                                                                                            (this
                                                                                                .state
                                                                                                .total * 1 + this.state.shop_tax * 1).toFixed(2)
                                                                                        }
                                                                                    </Text>
                                                                                </Table.Summary.Cell>
                                                                            </Table.Summary.Row>
                                                                        </>
                                                                    );
                                                                }}
                                                            />
                                                            <Button
                                                                type="primary"
                                                                className="btn-success"
                                                                style={{
                                                                    marginTop:
                                                                        "40px",
                                                                }}
                                                                htmlType="submit"
                                                            >
                                                                {t("save")}
                                                            </Button>
                                                        </Form.Item>
                                                    </>
                                                ) : (
                                                    <Alert
                                                        message="To save order, please add products to orders"
                                                        type="info"
                                                    />
                                                )}
                                            </Card>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Form>
                        <Modal
                            title={t("basic_modal")}
                            visible={this.state.showModal}
                            onOk={this.handleOk}
                            onCancel={this.handleCancel}
                        >
                            <div
                                className="row"
                                style={{
                                    marginRight: "10px",
                                }}
                            >
                                <Select
                                    style={{
                                        width: "500px",
                                    }}
                                    showSearch
                                    onChange={this.onChangeProduct}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children
                                            .toLowerCase()
                                            .indexOf(input.toLowerCase()) >= 0
                                    }
                                    placeholder={t("select_product")}
                                >
                                    {this.state.products.map((item, idx) => {
                                        return (
                                            <Option
                                                value={item.id}
                                                key={`${idx + 1}`}
                                            >
                                                {item.name}
                                            </Option>
                                        );
                                    })}
                                </Select>
                            </div>
                        </Modal>
                    </Content>
                </PageHeader>
            </PageLayout>
        );
    }
}

export default withTranslation()(OrderAdd);
