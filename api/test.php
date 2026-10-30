
<?php
header("Content-Type: application/json");

require_once "db.php";

$result = $conn->query("SHOW TABLES LIKE 'users'");

if ($result && $result->num_rows > 0) {
    echo json_encode([
        "success" => true,
        "message" => "Database connected. Users table found!"
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Users table not found in this database."
    ]);
}

$conn->close();
?>
