using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum PlayerType
{
    Empty,  // 0: �� ĭ
    Black,  // 1: ���� ��
    White   // 2: �� ��
}
public class GameManager : MonoBehaviour
{
    public GameObject blackStonePrefab;
    public GameObject whiteStonePrefab;
    public GameObject gridPrefab;

    private Dictionary<string, Grid> boardState; // Board ���¸� ��ųʸ��� ����
    [Range(3, 19)] public int boardSize = 15;

    private PlayerType currentPlayer = PlayerType.Black;

    void Start()
    {
        boardState = new Dictionary<string, Grid>();
        InitializeBoard();      // ���� ����
    }

    void InitializeBoard()
    {
        // ī�޶� ��ġ �̵�
        Camera mainCamera = Camera.main;
        int halfPos = boardSize / 2;
        mainCamera.transform.position = new Vector3(halfPos, boardSize, halfPos);
        mainCamera.transform.rotation = Quaternion.Euler(new Vector3(90, 0, 0));

        GameObject parent = new GameObject();
        parent.name = "Grids";

        for (int x = 0; x < boardSize; x++)
        {
            for (int z = 0; z < boardSize; z++)
            {
                string key = $"{x}_{z}";
                GameObject temp = Instantiate(gridPrefab, new Vector3(x, 0, z), Quaternion.identity);
                temp.transform.parent = parent.transform;
                temp.name = "Grid_" + key;
                Grid grid = temp.AddComponent<Grid>();
                grid.stoneType = PlayerType.Empty;
                grid.pos = new Vector2Int(x, z);
                boardState[key] = grid;
            }
        }
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Grid grid = IsValidPosition();
            if (grid != null)
            {
                PlaceStone(grid.pos);
            }
        }
    }
    bool ChangePlayer(PlayerType type)
    {
        if (type == PlayerType.Empty)
            return false;

        currentPlayer = type;
        return true;
    }
    Grid IsValidPosition()
    {
        foreach(var state in boardState)
        {
            if(state.Value.onMouse)
            {
                Debug.Log(state.Key);
                if(state.Value.stoneType == PlayerType.Empty)
                {
                    return state.Value;
                }
            }
        }
        return null;
    }

    void PlaceStone(Vector2Int pos)
    {
        string key = $"{pos.x}_{pos.y}";
        boardState[key].stoneType = currentPlayer == PlayerType.Black ? PlayerType.Black : PlayerType.White;

        GameObject stone = Instantiate(currentPlayer == PlayerType.Black ? blackStonePrefab : whiteStonePrefab,
                                        new Vector3(pos.x, 0, pos.y),
                                        Quaternion.identity);

        if (CheckWin(pos, boardState[key].stoneType))
        {
            Debug.Log($"{(currentPlayer == PlayerType.Black ? "�浹" : "�鵹")} wins!");
        }


        // �÷��̾� ��ȯ
        if(currentPlayer == PlayerType.Black)
        {
            ChangePlayer(PlayerType.White);
        }
        else if(currentPlayer == PlayerType.White)
        {
            ChangePlayer(PlayerType.Black);
        }
        else
        {
            Debug.LogWarning("�߸��� �÷��̾�");
            ChangePlayer(PlayerType.Black);
        }
    }

    bool CheckWin(Vector2Int pos, PlayerType playerStone)
    {
        int[][] directions = new int[][]
        {
            new int[] {1, 0}, // ����
            new int[] {0, 1}, // ����
            new int[] {1, 1}, // �밢�� \
            new int[] {1, -1} // �밢�� /
        };

        foreach (var dir in directions)
        {
            int count = 1;

            count += CountStones(pos, playerStone, dir[0], dir[1]);
            count += CountStones(pos, playerStone, -dir[0], -dir[1]);

            if (count >= 5)
                return true;
        }

        return false;
    }

    int CountStones(Vector2Int start, PlayerType playerStone, int dx, int dy)
    {
        int count = 0;
        Vector2Int pos = start;

        while (true)
        {
            pos += new Vector2Int(dx, dy);
            string key = $"{pos.x}_{pos.y}";

            if (!boardState.ContainsKey(key) || boardState[key].stoneType != playerStone)
                break;

            count++;
        }

        return count;
    }
}
