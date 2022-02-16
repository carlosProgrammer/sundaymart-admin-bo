import React, { useEffect, useMemo, useRef, useState } from "react";
import { Row, Col, Button, Layout, Spin, message } from "antd";
const { Footer, Content } = Layout;
import Sidebar from "../../layouts/Sidebar";
import ChatButton from "../../layouts/ChatButton";

import { useTranslation } from "react-i18next";
import CustomCard from "./components/ProductCard";
import Cart from "./components/Cart";
import Filter from "./components/Filter";
import Tabs from "./components/Tabs";
import OrderSummary from "./components/OrderSummary";
import AddUser from "./components/AddUser";
import ShippingAddress from "./components/ShippingAddress";
import DeliveryTime from "./components/DeliveryTime";
import ExtraProduct from "./components/ExtraProduct";
import reqwest from "reqwest";
import getActiveShipping from "../../requests/Shops/GetActiveShopping";
import getActiveDeliveryTransport from "../../requests/Shops/GetDeliveryTransport";
import timeUnitActive from "../../requests/TimeUnits/TimeUnitActive";
import addressActive from "../../requests/Address/AddressActive";
import orderSave from "../../requests/Orders/OrderSave";
import DeliveryType from "./components/DeliveryType";
import clientActive from "../../requests/Clients/ClientActive";
import {IMAGE_PATH, IS_DEMO} from "../../global";

const PosSystem = () => {
    const { t } = useTranslation();
    const [userOpen, setUserOpen] = useState(false);
    const [productTotal, setProductTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [pageIndex, setPageIndex] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [shop, setShop] = useState(undefined);
    const [category, setCategory] = useState(undefined);
    const [brand, setBrand] = useState(undefined);

    const [deliveryTypeOpen, setDeliveryTypeOpen] = useState(false);
    const [deliveryOpen, setDeliveryOpen] = useState(false);
    const [shippingOpen, setShippingOpen] = useState(false);
    const [productOpen, setProductOpen] = useState(false);
    const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [userOptions, setUserOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [shippings, setShippings] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [timeUnit, setTimeUnit] = useState([]);
    const [shopOptions, setShopOptions] = useState([]);
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [bags, setBags] = useState([1]);
    const [bagIndex, setBagIndex] = useState(0);
    const [extrasData, setExtrasData] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(undefined);
    const [deliveryType, setDeliveryType] = useState([]);
    const [delivery, setDelivery] = useState({});
    const [cart, setCart] = useState([
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

    const [total, setTotal] = useState(0);
    const [deliveryTime, setDeliveryTime] = useState(undefined);
    const [user, setUser] = useState(undefined);

    const [shippingId, setShippingId] = useState(undefined);
    const [deliveryDate, setDeliveryDate] = useState(undefined);
    const [address, setAddress] = useState(undefined);

    const categoryQuery = useMemo(
        () => (category ? `&category_id=${category}` : ""),
        [category]
    );

    const shopQuery = useMemo(() => (shop ? `&shop_id=${shop}` : ""), [shop]);
    const brandQuery = useMemo(
        () => (brand ? `&brand_id=${brand}` : ""),
        [brand]
    );

    const pageSizeQuery = useMemo(
        () => (pageSize ? `&length=${pageSize}` : ""),
        [pageSize]
    );

    const pageQuery = useMemo(() => `start=${pageIndex}`, [pageIndex, search]);

    const query = useMemo(
        () =>
            `${pageQuery}${pageSizeQuery}${categoryQuery}${shopQuery}${brandQuery}`,
        [pageQuery, pageSizeQuery, categoryQuery, brandQuery, shopQuery]
    );

    useEffect(() => {
        fetchShops();
        fetchUsers();
        getActiveClient();
    }, []);

    useEffect(() => {
        fetch({
            current: 1,
            pageSize: 12,
            query: query,
        });
    }, [query]);

    const fetchShops = () => {
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url: "/api/auth/shop/active",
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
        }).then((data) => {
            setShopOptions(data.data);
        });
    };

    const fetchCategories = (id) => {
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url: "/api/auth/category/active",
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
            data: {
                shop_id: id,
            },
        }).then((data) => {
            setCategoryOptions(data.data);
        });
    };
    const fetchBrands = (id) => {
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url: "/api/auth/brand/active",
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
            data: {
                shop_id: id,
            },
        }).then((data) => {
            setBrandOptions(data.data);
        });
    };
    const fetchUsers = (id) => {
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url: " /api/auth/client/active",
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
        }).then((data) => {
            setUserOptions(data.data);
        });
    };

    const fetch = (params = {}) => {
        setLoading(true);
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url:
                "/api/auth/product/datatable" +
                `?${params?.query ? params?.query : ""}${
                    params?.search ? `&search=${params?.search}` : ""
                }${`&active=${1}`}`,
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
        }).then((data) => {
            setLoading(false);
            const newData = data.data.map((item) => ({
                ...item,
                image_url: IMAGE_PATH + item.image_url,
            }));
            setProducts(products.concat(newData));
            setProductTotal(data.total);
        });
    };

    const getShipping = async (id) => {
        let data = await getActiveShipping(id);
        // console.log("Data", data);
        if (data.data.data.length > 0) {
            const newData = data.data?.data.map((item) => ({
                ...item,
                name: item.delivery_type?.name,
            }));

            // console.log("Shipping", newData);
            setShippings(newData);
        }
    };
    const getDeliveryType = async (id) => {
        let data = await getActiveDeliveryTransport(id);
        // console.log("Data", data);
        if (data.data.data.length > 0) {
            const newData = data.data?.data.map((item) => ({
                ...item,
                name: item?.delivery_transport?.name,
            }));

            setDeliveryType(newData);
        }
    };
    const getActiveAddress = async (client_id) => {
        let data = await addressActive(client_id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            setAddresses(data.data.data);
            setAddress(data.data.data[0]);
        }
    };
    const getActiveClient = async () => {
        let data = await clientActive();
        setClients(data.data.data);
    };

    const onChangeShop = (e) => {
        const newData = [...cart];
        if (!newData[bagIndex].shopId) {
            newData[bagIndex].shopId = e;
            setCart(newData);
        } else {
            newData[bagIndex].products = [];
            newData[bagIndex].total = 0;
            newData[bagIndex].shopId = e;
            setCart(newData);
        }
        setShop(e);
        getShipping(e);
        getDeliveryType(e);
        fetchCategories(e);
        fetchBrands(e);
        getActiveTimeUnits(e);
        setBrand(undefined);
        setCategory(undefined);
    };
    const onChangeCategory = (e) => {
        setCategory(e);
    };

    const onChangeBrand = (e) => {
        setBrand(e);
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetch({ query, search });
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const onChangeSearch = (event) => {
        setSearch(event);
    };

    const addProduct = (e) => {
        if (cart[bagIndex].shopId) {
            if (cart[bagIndex].products.some((item) => item.id === e.id)) {
                const newData = cart[bagIndex].products.map((item) => {
                    const taxes = item.taxes.reduce(
                        (cal, val) => cal + val.percent,
                        0
                    );
                    // console.log("If taxes", taxes);
                    if (item.id === e.id) {
                        return {
                            ...item,
                            qty: (item.qty += 1),
                            tax: ((taxes * item.price) / 100).toFixed(2),
                        };
                    } else {
                        return {
                            ...item,
                            tax: ((taxes * item.price) / 100).toFixed(2),
                        };
                    }
                });
                const total = newData.reduce(
                    (cal, val) => cal + val.price * val.qty,
                    0
                );
                const tax = newData.reduce((cal, val) => cal + val.tax * 1, 0);

                const data = [...cart];
                data[bagIndex].tax = (tax * 1).toFixed(2);
                data[bagIndex].total = (total * 1 + tax * 1).toFixed(2);
                data[bagIndex].products = newData;
                setCart(data);
            } else {
                const taxes = e.taxes.reduce(
                    (cal, val) => cal + val.percent,
                    0
                );
                // console.log("Else taxes", ((taxes * e.price) / 100).toFixed(2));
                // console.log("data", e);
                const data = {
                    ...e,
                    qty: 1,
                    tax: ((taxes * e.price) / 100).toFixed(2),
                };
                const newData = [...cart];
                newData[bagIndex].products.push(data);

                const total = newData[bagIndex].products.reduce(
                    (cal, val) => cal + val.price * val.qty,
                    0
                );
                // console.log("Products", newData[bagIndex].products);
                const tax = newData[bagIndex].products.reduce(
                    (cal, val) => cal + val.tax * 1,
                    0
                );

                newData[bagIndex].tax = (tax * 1).toFixed(2);
                newData[bagIndex].total = (total * 1 + tax * 1).toFixed(2);
                setCart(newData);
            }
        } else {
            message.warn("Please select shop!");
        }
    };

    const addProductWithExtrass = (extrasData) => {
        if (cart[bagIndex].shopId) {
            if (
                cart[bagIndex].products.some(
                    (item) => item.id === selectedProduct?.id
                )
            ) {
                const newData = cart[bagIndex].products.map((item) => {
                    if (item.id === selectedProduct?.id) {
                        return {
                            ...item,
                            qty: (item.qty += 1),
                            price: item.price + extrasData?.price,
                        };
                    } else {
                        return item;
                    }
                });
                const total = newData.reduce(
                    (cal, val) => cal + val.price * val.qty,
                    0
                );

                const data = [...cart];
                data[bagIndex].total = total.toFixed(2);
                data[bagIndex].products = newData;
                setCart(data);
            } else {
                const data = {
                    ...selectedProduct,
                    qty: 1,
                    price: selectedProduct?.price + extrasData.price,
                };
                const newData = [...cart];
                newData[bagIndex].products.push(data);

                const total = newData[bagIndex].products.reduce(
                    (cal, val) => cal + val.price * val.qty,
                    0
                );
                newData[bagIndex].total = total.toFixed(2);
                setCart(newData);
            }
        } else {
            message.warn("Please select shop!");
        }
    };
    const viewMore = (page) => {
        setPageIndex((prev) => prev + 1);
    };
    const handleClose = () => {
        setUserOpen(false);
        fetchUsers();
    };

    const getExtrasData = (itm) => {
        setSelectedProduct(itm);
        setLoading(true);
        const token = localStorage.getItem("jwt_token");
        reqwest({
            url: "/api/auth/product/get" + `?id=${itm?.id}`,
            method: "post",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
        }).then((data) => {
            setProductOpen(true);
            const newData = data.data.extras.map((item) => ({
                ...item,
                extras: item.extras.map((itm) => ({
                    ...itm,
                    image_url: IMAGE_PATH + itm.image_url,
                })),
            }));
            // console.log(newData);

            setExtrasData(newData);

            setLoading(false);
        });
    };

    const getActiveTimeUnits = async (id) => {
        let data = await timeUnitActive(id);
        if (data.data.success == 1 && data.data.data.length > 0) {
            setTimeUnit(data.data.data);
        }
    };
    const onChangeUser = (e) => {
        setUser(e);
        const newData = [...cart];
        newData[bagIndex].user = e;

        getActiveAddress(e.id);

        setCart(newData);
    };
    const onFinish = async () => {
        if(IS_DEMO) {
            message.warn("You cannot save in demo mode");
            return;
        }

        const prodTaxes = cart[bagIndex].products.map((item) => ({
            tax: item.taxes
                .reduce((cal, val) => cal + (val.percent * item.price) / 100, 0)
                .toFixed(2),
        }));
        const total_tax = prodTaxes.reduce((cal, val) => cal + val.tax * 1, 0);
        const newProducts = cart.map((cart) => ({
            total: cart.total,
            product_details: cart.products.map((item) => ({
                discount: 0,
                discount_total: 0,
                id: item.id,
                id_replace_product: null,
                is_replaced: 0,
                name: item.name,
                price: item.price,
                tax: item.taxes
                    .reduce(
                        (cal, val) => cal + (val.percent * item.price) / 100,
                        0
                    )
                    .toFixed(2),
                price_total: item.price * item.qty,
                quantity: item.qty,
                total: item.price * item.qty,
            })),
            id_user: cart.user.id,
            id_delivery_address: cart.address?.id,
            id_shop: cart.shopId,
            delivery_time_id: cart.deliveryTime,
            delivery_date: cart.deliveryDate,
            total_discount: 0,
            delivery_boy: null,
            delivery_boy_comment: "",
            order_status: 1,
            payment_method: 1,
            payment_status: 1,
            tax: total_tax,
            ...delivery,
            shipping_box_id: null,
        }));

        console.log("Save data", newProducts[bagIndex]);

        // console.log({ ...params, ...state });
        // let data = await orderSave(params, state, null);

        // if (data.data.success == 1) {
        //     setCart([]);
        //     setAddress(undefined);
        //     setUser(undefined);
        //     setDeliveryDate(undefined);
        //     setDeliveryTime(undefined);
        //     setTotal(0);
        //     setShop(undefined);
        //     setBrand(undefined);
        //     setCategory(undefined);
        //     setShippingId(undefined);
        //     setOrderSummaryOpen(false);
        // }
    };

    const clearBags = () => {
        setBagIndex(0);
        setBags([1]);
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
    const handleChangeBadge = (idx) => {
        setBagIndex(idx);
        setShop(cart[idx].shopId);
    };
    const handleDeliveryData = (value) => {
        const newData = [...cart];
        newData[bagIndex].delivery_fee = value?.delivery_fee;
        newData[bagIndex].total =
            newData[bagIndex].total * 1 + value?.delivery_fee * 1;
        console.log("New data", newData[bagIndex]);

        setDelivery(value);
    };
    return (
        <>
            <Layout
                style={{
                    minHeight: "100vh",
                    position: "relative",
                }}
            >
                <Sidebar />
                <Layout className="site-layout">
                    <Content style={{ margin: "16px" }}>
                        <Spin
                            size="large"
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            spinning={loading}
                            wrapperClassName="d-flex flex-row justify-content-center align-items-center"
                        >
                            <Row gutter={20}>
                                <Col span={16}>
                                    <Filter
                                        search={search}
                                        setSearch={onChangeSearch}
                                        shop={cart[bagIndex].shopId}
                                        setShop={onChangeShop}
                                        brand={brand}
                                        setBrand={onChangeBrand}
                                        category={category}
                                        setCategory={onChangeCategory}
                                        brandOptions={brandOptions}
                                        categoryOptions={categoryOptions}
                                        shopOptions={shopOptions}
                                        setCart={clearBags}
                                    />
                                    <CustomCard
                                        products={products}
                                        showMore={viewMore}
                                        addProduct={addProduct}
                                        extrasData={getExtrasData}
                                        handleOpen={getExtrasData}
                                    />
                                </Col>
                                <Col
                                    className="d-flex flex-column align-items-end"
                                    span={8}
                                    style={{
                                        borderRadius: 12,
                                    }}
                                >
                                    <Tabs
                                        setUserOpen={setUserOpen}
                                        cart={cart}
                                        setCart={setCart}
                                        bagIndex={bagIndex}
                                        setBagIndex={setBagIndex}
                                        shippingAddress={setShippingOpen}
                                        onChangeUser={onChangeUser}
                                        addresses={addresses}
                                        userOptions={userOptions}
                                        disable={!shop}
                                        bags={bags}
                                        handleChangeBadge={handleChangeBadge}
                                        setBags={setBags}
                                        setDeliveryTypeOpen={
                                            setDeliveryTypeOpen
                                        }
                                        setDeliveryOpen={setDeliveryOpen}
                                    />
                                    <Cart
                                        disable={
                                            !cart[bagIndex].user ||
                                            // !cart[bagIndex].shippingId ||
                                            !cart[bagIndex].address ||
                                            !cart[bagIndex].deliveryDate ||
                                            !cart[bagIndex].deliveryTime
                                        }
                                        setCart={setCart}
                                        cart={cart}
                                        bagIndex={bagIndex}
                                        total={cart[bagIndex].total}
                                        setTotal={setTotal}
                                        placeOrder={() => {
                                            setOrderSummaryOpen(true);
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Spin>
                    </Content>
                    <ChatButton />
                    {/* <Footer style={{ textAlign: "center" }}>
                        Gmarket 2021
                    </Footer> */}
                </Layout>

                <AddUser
                    open={userOpen}
                    close={handleClose}
                    outSideClick={() => setUserOpen(false)}
                />
                <DeliveryType
                    shippings={shippings}
                    deliveryTypeOptions={deliveryType}
                    open={deliveryTypeOpen}
                    close={() => setDeliveryTypeOpen(false)}
                    outSideClick={() => setDeliveryTypeOpen(false)}
                    handleSave={(value) => {
                        handleDeliveryData(value);
                        setDeliveryTypeOpen(false);
                    }}
                />
                <ShippingAddress
                    open={shippingOpen}
                    clients={clients}
                    close={() => setShippingOpen(false)}
                    outSideClick={() => setShippingOpen(false)}
                />
                <DeliveryTime
                    setCart={setCart}
                    cart={cart}
                    bagIndex={bagIndex}
                    open={deliveryOpen}
                    timeUnit={timeUnit}
                    outSideClick={() => setDeliveryOpen(false)}
                    close={() => setDeliveryOpen(false)}
                />
                <ExtraProduct
                    addExtras={(e) => addProductWithExtrass(e)}
                    open={productOpen}
                    extrasData={extrasData}
                    close={() => setProductOpen(false)}
                    outSideClick={() => setProductOpen(false)}
                />
                <OrderSummary
                    setCart={setCart}
                    cart={cart}
                    bagIndex={bagIndex}
                    onFinish={onFinish}
                    disable={
                        !cart[bagIndex].user ||
                        // !cart[bagIndex].shippingId ||
                        !cart[bagIndex].address ||
                        !cart[bagIndex].deliveryDate ||
                        !cart[bagIndex].deliveryTime
                    }
                    open={orderSummaryOpen}
                    outSideClick={() => setOrderSummaryOpen(false)}
                    close={() => setOrderSummaryOpen(false)}
                />
            </Layout>
        </>
    );
};

export default PosSystem;
