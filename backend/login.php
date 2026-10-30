<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://harika-073.github.io");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit(json_encode(["success" => false, "message" => "POST required"]));
}

require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";
$requestedRole = $data["role"] ?? "user";

$stmt = $conn->prepare(
    "SELECT id, name, email, password, role FROM users WHERE email = ?"
);
$stmt->bind_param("s", $email);
$stmt->execute();

$user = $stmt->get_result()->fetch_assoc();

if ($user && password_verify($password, $user["password"])) {

    if ($user["role"] !== $requestedRole) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "Selected account type does not match your account."
        ]);
    } else {
        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user" => [
                "id" => $user["id"],
                "name" => $user["name"],
                "email" => $user["email"],
                "role" => $user["role"]
            ]
        ]);
    }

} else {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Invalid email or password"
    ]);
}

$stmt->close();
$conn->close();
?>
