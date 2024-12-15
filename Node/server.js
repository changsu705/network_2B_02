const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mysql = require('mysql2');

// 서버 설정
const app = express();
const port = 3000;

// HTTP 서버와 WebSocket 서버 설정
const server = http.createServer(app);
const io = new Server(server);

// MySQL 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'your_mysql_username',
    password: 'your_mysql_password',
    database: 'Omok',
});

db.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
    } else {
        console.log('MySQL에 성공적으로 연결되었습니다.');
    }
});

// 클라이언트 연결 시 처리
io.on('connection', (socket) => {
    console.log('클라이언트 연결됨:', socket.id);

    // 로그인 처리
    socket.on('login', ({ username, password }) => {
        const query = `SELECT player_id FROM Player WHERE username = ? AND password = ?`;
        db.query(query, [username, password], (err, results) => {
            if (err || results.length === 0) {
                socket.emit('login-response', { success: false, message: '로그인 실패' });
            } else {
                socket.emit('login-response', { success: true, playerId: results[0].player_id });
            }
        });
    });

    // 게임 시작 처리
    socket.on('start-game', () => {
        const query = `INSERT INTO Game (start_time) VALUES (NOW())`;
        db.query(query, (err, result) => {
            if (err) {
                socket.emit('start-game-response', { success: false });
            } else {
                socket.emit('start-game-response', { success: true, gameId: result.insertId });
            }
        });
    });


    //타이머//////////////////////////////////
    const gameTimers = {}; // 게임별 타이머 관리 객체

    function startTurnTimer(gameId, duration) {
        if (gameTimers[gameId]) {
            clearTimeout(gameTimers[gameId]); // 기존 타이머 제거
        }

        gameTimers[gameId] = setTimeout(() => {
            // 현재 게임의 마지막 move_number 조회
            const getLastMoveQuery = `SELECT IFNULL(MAX(move_number), 0) AS last_move FROM Move WHERE game_id = ?`;

            db.query(getLastMoveQuery, [gameId], (err, results) => {
                if (err || results.length === 0) {
                    console.error('타이머 처리 중 오류 발생:', err);
                    return;
                }

                const lastMoveNumber = results[0].last_move;
                const nextPlayerId = (lastMoveNumber % 2 === 0) ? 2 : 1; // 홀짝으로 턴 결정

                // 강제로 다음 턴으로 이동 (move_number 증가)
                const insertMoveQuery = `
        INSERT INTO Move (game_id, player_id, move_number, x_coordinate, y_coordinate)
        VALUES (?, ?, ?, ?, ?)
      `;

                db.query(insertMoveQuery, [gameId, nextPlayerId, lastMoveNumber + 1, -1, -1], (err) => {
                    if (err) {
                        console.error('다음 턴 강제 전환 실패:', err);
                        return;
                    }

                    // 클라이언트에 턴 전환 알림
                    io.emit('update-turn', { gameId, currentPlayerId: nextPlayerId });

                    // 다음 턴 타이머 시작
                    startTurnTimer(gameId, duration);
                });
            });
        }, duration * 1000); // duration(초)을 밀리초로 변환
    }

    // 돌 놓기 처리 시 타이머 재설정
    socket.on('place-stone', (data) => {
        const { gameId, playerId } = data;

        // 돌을 놓았으므로 타이머 재설정
        startTurnTimer(gameId, 30); // 예시: 30초 타이머
    });

    //타이머//////////////////////////////////

    // 돌 놓기 처리
    socket.on('place-stone', ({ gameId, playerId, x, y }) => {
        // 현재 게임의 마지막 move_number를 조회하여 턴 확인
        const checkTurnQuery = `
    SELECT IFNULL(MAX(move_number), 0) AS last_move 
    FROM Move 
    WHERE game_id = ?
  `;

        db.query(checkTurnQuery, [gameId], (err, results) => {
            if (err) {
                socket.emit('place-stone-response', { success: false, message: '오류 발생: 게임 정보를 가져올 수 없습니다.' });
                return;
            }

            const lastMoveNumber = results[0].last_move;
            const expectedPlayerId = (lastMoveNumber % 2 === 0) ? 1 : 2;

            if (playerId !== expectedPlayerId) {
                socket.emit('place-stone-response', { success: false, message: '당신의 턴이 아닙니다.' });
                return;
            }

            // 이미 해당 좌표에 돌이 있는지 추가 확인
            const checkDuplicateQuery = `
      SELECT 1 
      FROM Move 
      WHERE game_id = ? AND x_coordinate = ? AND y_coordinate = ?
    `;

            db.query(checkDuplicateQuery, [gameId, x, y], (err, results) => {
                if (err) {
                    socket.emit('place-stone-response', { success: false, message: '오류 발생: 중복 확인 실패.' });
                    return;
                }

                if (results.length > 0) {
                    socket.emit('place-stone-response', { success: false, message: '이미 해당 위치에 돌이 놓여 있습니다.' });
                    return;
                }

                // 중복이 없으면 돌을 놓음
                const insertStoneQuery = `
        INSERT INTO Move (game_id, player_id, move_number, x_coordinate, y_coordinate)
        VALUES (?, ?, ?, ?, ?)
      `;

                db.query(insertStoneQuery, [gameId, playerId, lastMoveNumber + 1, x, y], (err, results) => {
                    if (err) {
                        socket.emit('place-stone-response', { success: false, message: '돌 놓기 중 오류가 발생했습니다.' });
                    } else {
                        // 돌 놓기 성공
                        socket.emit('place-stone-response', { success: true, moveNumber: lastMoveNumber + 1 });
                        io.emit('update-turn', { gameId, nextPlayerId: (playerId === 1 ? 2 : 1) });
                    }
                });
            });
        });
    });


    // 게임 종료 처리
    socket.on('end-game', ({ gameId, winnerId }) => {
        const query = `
      UPDATE Game SET end_time = NOW(), winner_id = ? WHERE game_id = ?
    `;
        db.query(query, [winnerId, gameId], (err) => {
            if (err) {
                socket.emit('end-game-response', { success: false });
            } else {
                socket.emit('end-game-response', { success: true });
            }
        });
    });

    // 연결 해제 시
    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제:', socket.id);
    });
});

// 서버 시작
server.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});


const cors = require('cors');

// CORS 설정 추가
app.use(cors({
    origin: '*', // Unity 클라이언트의 URL을 명시하거나 '*'로 모든 요청 허용
}));