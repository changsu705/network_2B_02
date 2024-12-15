using System.Collections;
using System.Collections.Generic;
using System.Net.Sockets;
using UnityEngine;
using SocketIOClient;

public class OmokClient : MonoBehaviour
{
    private SocketIO client;

    async void Start()
    {
        // 서버 URL에 맞게 설정
        client = new SocketIO("http://localhost:3000");

        client.OnConnected += async () =>
        {
            Debug.Log("서버에 연결되었습니다.");

            // 로그인 예제
            await client.EmitAsync("login", new
            {
                username = "testUser",
                password = "testPass"
            });

            // 서버로부터 응답 처리
            client.On("login-response", response =>
            {
                var data = response.GetValue<JSONObject>();
                Debug.Log("로그인 응답: " + data);
            });
        };

        await client.ConnectAsync();
    }

    private async void OnApplicationQuit()
    {
        if (client != null)
        {
            await client.DisconnectAsync();
        }
    }
}
