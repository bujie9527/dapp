"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type User = { id: string; address: string; createdAt: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: User[] }>("/users")
      .then((data) => setUsers(data.items ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  if (!users.length && !loading) {
    return (
      <div>
        <h1>用户列表</h1>
        <p>暂无 API 或无用户。若 API 未实现 /users，可在此用 events 去重或直接查 DB。</p>
      </div>
    );
  }

  return (
    <div>
      <h1>用户列表</h1>
      {loading ? (
        <p>加载中…</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #3f3f46" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>地址</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #27272a" }}>
                <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{u.address}</td>
                <td style={{ padding: "0.5rem" }}>{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
