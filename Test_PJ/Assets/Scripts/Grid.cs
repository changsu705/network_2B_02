using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Grid : MonoBehaviour
{
    public PlayerType stoneType;
    public Vector2Int pos;
    public bool onMouse = false;

    private void OnMouseEnter()
    {
        onMouse = true;
    }
    private void OnMouseExit()
    {
        onMouse = false;
    }
}
