import React, {useState} from 'react';
import {useTranslation, withTranslation} from "react-i18next";
import PageLayout from "../../layouts/PageLayout";
import {Breadcrumb, Button, PageHeader, Popconfirm, Table, Tag} from "antd";
import {Content} from "antd/es/layout/layout";
import reqwest from "reqwest";

const Transactions = (props) => {
    const {t} = useTranslation();
    const columns = [
        {
            title: "Name",
            dataIndex: "name",
        },
    ];

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleTableChange = (pagination, filters, sorter) => {
        fetch({
            sortField: sorter.field,
            sortOrder: sorter.order,
            pagination,
            ...filters,
        });

        setPagination(pagination);
    };

    const fetch = (params = {}) => {
        const token = localStorage.getItem("jwt_token");
        setLoading(true);
        reqwest({
            url: "/api/auth/taxes/datatable",
            method: "get",
            type: "json",
            headers: {
                Authorization: "Bearer " + token,
            },
            data: {
                length: params.pagination.pageSize,
                start:
                    (params.pagination.current - 1) *
                    params.pagination.pageSize,
            },
        }).then((data) => {
            setLoading(false);
            setData(data.data);
            setPagination({
                current: params.pagination.current,
                pageSize: 10,
                total: data.total,
            });
        });
    };

    return (
        <PageLayout>
            <Breadcrumb style={{margin: "16px 0"}}>
                <Breadcrumb.Item>{t("transactions")}</Breadcrumb.Item>
            </Breadcrumb>
            <PageHeader
                className="site-page-header"
                title={t("transactions")}
                subTitle={t("transactions_info")}
            >
                <Content
                    className="site-layout-background"
                    style={{overflow: "auto"}}
                >
                    <Table
                        columns={columns}
                        rowKey={(record) => record.id}
                        dataSource={data}
                        pagination={pagination}
                        loading={loading}
                        onChange={handleTableChange}
                    />
                </Content>
            </PageHeader>
        </PageLayout>);
}

export default withTranslation()(Transactions);
