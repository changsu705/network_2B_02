// 필요한 모듈 가져오기
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');


// 서버 설정
const app = express();
const port = 3000;


// HTTP 서버와 WebSocket 서버 설정
const server = http.createServer(app);
const io = new Server(server);


// MySQL 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ckdtnckdtn1!',
    database: 'Game_DB_05',
});


db.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
    } else {
        console.log('MySQL에 성공적으로 연결되었습니다.');
    }
});


// 게임별 타이머 관리
const gameTimers = {};
const TURN_TIME_LIMIT = 30; // 턴 제한 시간 (초)


// 타이머 초기화 함수
function startTurnTimer(gameId, currentPlayerId) {
    if (gameTimers[gameId]) clearTimeout(gameTimers[gameId]);


    gameTimers[gameId] = setTimeout(() => {
        io.to(`game-${gameId}`).emit('time-out', { gameId, playerId: currentPlayerId });
        io.to(`game-${gameId}`).emit('update-turn', { gameId, nextPlayerId: (currentPlayerId === 1 ? 2 : 1) });
    }, TURN_TIME_LIMIT * 1000);


    io.to(`game-${gameId}`).emit('start-timer', { gameId, playerId: currentPlayerId, timeLimit: TURN_TIME_LIMIT });
}


// 게임 승리 판정을 위한 방향
const DIRECTIONS = [
    { dx: 1, dy: 0 },  // 가로
    { dx: 0, dy: 1 },  // 세로
    { dx: 1, dy: 1 },  // 대각선 (\)
    { dx: 1, dy: -1 }  // 대각선 (/)
];


// 승리 조건 체크 함수
function checkWin(gameId, x, y, playerId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT x_coordinate, y_coordinate FROM Move WHERE game_id = ? AND player_id = ?`;
        db.query(query, [gameId, playerId], (err, results) => {
            if (err) return reject(err);


            const stones = results.map(row => ({ x: row.x_coordinate, y: row.y_coordinate }));


            for (const { dx, dy } of DIRECTIONS) {
                let count = 1;


                // 한쪽 방향으로 체크
                for (let i = 1; i < 5; i++) {
                    if (stones.some(stone => stone.x === x + dx * i && stone.y === y + dy * i)) {
                        count++;
                    } else {
                        break;
                    }
                }


                // 반대 방향으로 체크
                for (let i = 1; i < 5; i++) {
                    if (stones.some(stone => stone.x === x - dx * i && stone.y === y - dy * i)) {
                        count++;
                    } else {
                        break;
                    }
                }


                if (count >= 5) return resolve(true);
            }


            resolve(false);
        });
    });
}


// 랭킹 업데이트 함수
function updateRanking(playerId) {
    const query = `INSERT INTO Ranking (player_id, score) VALUES (?, 1)
                   ON DUPLICATE KEY UPDATE score = score + 1`;
    db.query(query, [playerId], (err) => {
        if (err) console.error('랭킹 업데이트 실패:', err);
    });
}


// WebSocket 연결
io.on('connection', (socket) => {
    console.log('클라이언트 연결됨:', socket.id);


    // 게임 룸 생성
    socket.on('create-game', ({ hostPlayerId }) => {
        const query = `INSERT INTO Game (start_time, host_player_id) VALUES (NOW(), ?)`;
        db.query(query, [hostPlayerId], (err, result) => {
            if (err) {
                socket.emit('create-game-response', { success: false, message: '게임 생성 실패' });
            } else {
                const gameId = result.insertId;
                socket.join(`game-${gameId}`);
                socket.emit('create-game-response', { success: true, gameId });
                console.log(`Game room created: game-${gameId}`);
            }
        });
    });


    // 게임 룸 참여
    socket.on('join-game', (gameId) => {
        socket.join(`game-${gameId}`);
        console.log(`Socket ${socket.id} joined game-${gameId}`);
    });
    
    // 회원가입 처리
    socket.on('signup', ({ username, password }) => {
        // 먼저 사용자가 이미 존재하는지 확인
        const checkUserQuery = `SELECT 1 FROM Player WHERE username = ?`;
        db.query(checkUserQuery, [username], (err, results) => {
            if (err) {
                socket.emit('signup-response', { success: false, message: '회원가입 중 오류가 발생했습니다.' });
                return;
            }
    
            if (results.length > 0) {
                socket.emit('signup-response', { success: false, message: '이미 존재하는 사용자 이름입니다.' });
                return;
            }
    
            // 사용자 이름이 존재하지 않으면 비밀번호를 암호화하고 DB에 추가
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    socket.emit('signup-response', { success: false, message: '비밀번호 암호화 중 오류가 발생했습니다.' });
                    return;
                }
    
                const insertUserQuery = `INSERT INTO Player (username, password) VALUES (?, ?)`;
                db.query(insertUserQuery, [username, hashedPassword], (err) => {
                    if (err) {
                        socket.emit('signup-response', { success: false, message: '회원가입 중 오류가 발생했습니다.' });
                        return;
                    }
    
                    socket.emit('signup-response', { success: true, message: '회원가입이 완료되었습니다.' });
                });
            });
        });
    });
    
    // 로그인 처리
    socket.on('login', ({ username, password }) => {
        const query = `SELECT player_id, password FROM Player WHERE username = ?`;
        db.query(query, [username], (err, results) => {
            if (err || results.length === 0) {
                socket.emit('login-response', { success: false, message: '로그인 실패' });
            } else {
                const hashedPassword = results[0].password;
                const playerId = results[0].player_id;


                bcrypt.compare(password, hashedPassword, (err, match) => {
                    if (err || !match) {
                        socket.emit('login-response', { success: false, message: '로그인 실패' });
                    } else {
                        socket.emit('login-response', { success: true, playerId });
                    }
                });
            }
        });
    });


    // 게임 시작 처리
    socket.on('start-game', ({ gameId }) => {
        const query = `UPDATE Game SET start_time = NOW() WHERE game_id = ?`;
        db.query(query, [gameId], (err) => {
            if (err) {
                socket.emit('start-game-response', { success: false });
            } else {
                socket.emit('start-game-response', { success: true, gameId });


                // 첫 번째 플레이어 턴 시작
                startTurnTimer(gameId, 1);
            }
        });
    });


    // 돌 놓기 처리
    socket.on('place-stone', async ({ gameId, playerId, x, y }) => {
        const checkTurnQuery = `SELECT IFNULL(MAX(move_number), 0) AS last_move FROM Move WHERE game_id = ?`;


        db.query(checkTurnQuery, [gameId], async (err, results) => {
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


            const checkDuplicateQuery = `SELECT 1 FROM Move WHERE game_id = ? AND x_coordinate = ? AND y_coordinate = ?`;


            db.query(checkDuplicateQuery, [gameId, x, y], async (err, results) => {
                if (err) {
                    socket.emit('place-stone-response', { success: false, message: '오류 발생: 중복 확인 실패.' });
                    return;
                }


                if (results.length > 0) {
                    socket.emit('place-stone-response', { success: false, message: '이미 해당 위치에 돌이 놓여 있습니다.' });
                    return;
                }


                const insertStoneQuery = `INSERT INTO Move (game_id, player_id, move_number, x_coordinate, y_coordinate) VALUES (?, ?, ?, ?, ?)`;


                db.query(insertStoneQuery, [gameId, playerId, lastMoveNumber + 1, x, y], async (err) => {
                    if (err) {
                        socket.emit('place-stone-response', { success: false, message: '돌 놓기 중 오류가 발생했습니다.' });
                        return;
                    }


                    // 승리 판정
                    const isWin = await checkWin(gameId, x, y, playerId);


                    if (isWin) {
                        io.to(`game-${gameId}`).emit('game-over', { gameId, winnerId: playerId });


                        // 랭킹 업데이트
                        updateRanking(playerId);


                        // 게임 종료
                        const endGameQuery = `UPDATE Game SET end_time = NOW(), winner_id = ? WHERE game_id = ?`;
                        db.query(endGameQuery, [playerId, gameId], (err) => {
                            if (err) {
                                console.error('게임 종료 업데이트 실패:', err);
                            }
                        });
                    } else {
                        const nextPlayerId = (playerId === 1 ? 2 : 1);
                        io.to(`game-${gameId}`).emit('update-turn', { gameId, nextPlayerId });


                        // 다음 플레이어 타이머 시작
                        startTurnTimer(gameId, nextPlayerId);
                    }


                    socket.emit('place-stone-response', { success: true, moveNumber: lastMoveNumber + 1 });
                });
            });
        });
    });
    
    
     socket.on('get-board', ({ gameId }) => {
        const query = `SELECT player_id, x_coordinate, y_coordinate FROM Move WHERE game_id = ? ORDER BY move_number ASC`;
        db.query(query, [gameId], (err, results) => {
            if (err) {
                socket.emit('get-board-response', { success: false, message: '보드 데이터를 가져올 수 없습니다.' });
                return;
            }
            // 성공적으로 데이터를 클라이언트로 보냄
            socket.emit('get-board-response', { success: true, moves: results });
        });
    });




    // 랭킹 조회 처리
    socket.on('get-ranking', () => {
        const query = `SELECT Player.username, Ranking.score FROM Ranking
                       JOIN Player ON Ranking.player_id = Player.player_id
                       ORDER BY Ranking.score DESC LIMIT 10`;


        db.query(query, (err, results) => {
            if (err) {
                socket.emit('get-ranking-response', { success: false, message: '랭킹 조회 실패' });
                return;
            }


            socket.emit('get-ranking-response', { success: true, ranking: results });
        });
    });


    // 연결 해제 시 처리
    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제:', socket.id);
    });
});


// 서버 시작
server.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});



