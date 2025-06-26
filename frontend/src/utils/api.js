const API_URL = "http://192.168.1.171:3001/api/logs";

export async function logEvent(data) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getLogs() {
  const res = await fetch(API_URL);
  return res.json();
}

export async function deleteLog(id) {
  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}
