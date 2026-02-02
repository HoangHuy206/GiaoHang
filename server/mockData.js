const MOCK_SHOPS = [
    {
        id: 1,
        name: "Phở Gia Truyền Bát Đàn",
        user_id: 1,
        image_url: "https://example.com/pho.jpg",
        address: "49 Bát Đàn, Hà Nội",
        lat: 21.032,
        lng: 105.848
    },
    {
        id: 2,
        name: "Bún Chả Hương Liên",
        user_id: 2,
        image_url: "https://example.com/buncha.jpg",
        address: "24 Lê Văn Hưu, Hà Nội",
        lat: 21.018,
        lng: 105.855
    },
    {
        id: 3,
        name: "Cơm Tấm Sài Gòn",
        user_id: 3,
        image_url: "https://example.com/comtam.jpg",
        address: "59 Nguyễn Du, Hà Nội",
        lat: 21.022,
        lng: 105.842
    },
    {
        id: 4,
        name: "Tocotoco Bubble Tea",
        user_id: 4,
        image_url: "https://example.com/toco.jpg",
        address: "102 Cầu Giấy, Hà Nội",
        lat: 21.035,
        lng: 105.795
    }
];

const MOCK_PRODUCTS = [
    { id: 1, shop_id: 1, name: "Phở Bò Tái Chín", price: 50000, image_url: "", shop_name: "Phở Gia Truyền Bát Đàn" },
    { id: 2, shop_id: 1, name: "Phở Bò Đặc Biệt", price: 70000, image_url: "", shop_name: "Phở Gia Truyền Bát Đàn" },
    { id: 3, shop_id: 1, name: "Quẩy", price: 5000, image_url: "", shop_name: "Phở Gia Truyền Bát Đàn" },
    { id: 4, shop_id: 2, name: "Bún Chả Obama", price: 60000, image_url: "", shop_name: "Bún Chả Hương Liên" },
    { id: 5, shop_id: 2, name: "Nem Cua Bể", price: 20000, image_url: "", shop_name: "Bún Chả Hương Liên" },
    { id: 6, shop_id: 3, name: "Cơm Tấm Sườn Bì Chả", price: 55000, image_url: "", shop_name: "Cơm Tấm Sài Gòn" },
    { id: 7, shop_id: 3, name: "Canh Khổ Qua", price: 15000, image_url: "", shop_name: "Cơm Tấm Sài Gòn" },
    { id: 8, shop_id: 4, name: "Trà Sữa Trân Châu Hoàng Gia", price: 42000, image_url: "", shop_name: "Tocotoco Bubble Tea" },
    { id: 9, shop_id: 4, name: "Trà Đào Cam Sả", price: 45000, image_url: "", shop_name: "Tocotoco Bubble Tea" }
];

module.exports = { MOCK_SHOPS, MOCK_PRODUCTS };
