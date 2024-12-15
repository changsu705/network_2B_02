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
        // ���� URL�� �°� ����
        client = new SocketIO("http://localhost:3000");

        client.OnConnected += async () =>
        {
            Debug.Log("������ ����Ǿ����ϴ�.");

            // �α��� ����
            await client.EmitAsync("login", new
            {
                username = "testUser",
                password = "testPass"
            });

            // �����κ��� ���� ó��
            client.On("login-response", response =>
            {
                var data = response.GetValue<JSONObject>();
                Debug.Log("�α��� ����: " + data);
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
