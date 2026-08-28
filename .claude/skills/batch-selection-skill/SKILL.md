When User gets Store Dispatch What is the batch flow ltes understand =>

User Selects released Production Order And select then That selected production order items populated in Store Dispatch Line level Then when User selects From wherehouse then /api/Common/WarehouseWiseBatchOfItem this api calls with warehouse code and item code and return [
    {
        "SlNo": 1,
        "BaseUniqueId": "1-Batch-2026-19082026-001",
        "ItemCode": "1000003",
        "ItemName": "COW MILK",
        "CompanyCode": 0,
        "CompanyName": "",
        "WarehouseCode": "19WB0001",
        "WarehouseName": "Raw Material Whse.",
        "BatchNo": "Batch-2026-19082026-001",
        "LotNo": "",
        "ConsumptionQty": "",
        "Stock": 218,
        "AcceptedQty": "",
        "Remarks": "",
        "ReceivedQty": "",
        "InDate": "19-08-2026",
        "BatchName": ""
    },
    {
        "SlNo": 2,
        "BaseUniqueId": "2-SI210826/01",
        "ItemCode": "1000003",
        "ItemName": "COW MILK",
        "CompanyCode": 0,
        "CompanyName": "",
        "WarehouseCode": "19WB0001",
        "WarehouseName": "Raw Material Whse.",
        "BatchNo": "SI210826/01",
        "LotNo": "",
        "ConsumptionQty": "",
        "Stock": 150.7,
        "AcceptedQty": "",
        "Remarks": "",
        "ReceivedQty": "",
        "InDate": "21-08-2026",
        "BatchName": ""
    }
] now bind batches with item to make post payload if an itam have multiple batches then we take tht batches in FIFO basis InDate Basis means take 19-08-2026 first after finish all the item from batch then take 21-08-2026 bathes items ,

Also Check before creating payload if some items are ManageBatchNumbers tNO then in payload not needed to send BatchNumbers details