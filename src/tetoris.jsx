import React, { useState, useEffect, useRef } from 'react';
import liff from '@line/liff'
// import { Button } from '@/components/ui/button';

// Tetromino shapes
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]]
];

const COLORS = [
  '#FF0D72', '#0DC2FF', '#0DFF72', 
  '#F538FF', '#FF8E0D', '#FFE138', 
  '#3877FF'
];

const Tetris = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameStateRef = useRef({
    board: [],
    currentPiece: null,
    currentPosition: { x: 0, y: 0 },
    clickCount: 0,
    mouseDownTimer: null,
    mouseDownDirection: null
  });

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;

  const initializeGame = () => {
    const board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    gameStateRef.current.board = board;
    gameStateRef.current.currentPiece = null;
    gameStateRef.current.currentPosition = { x: Math.floor(COLS / 2), y: 0 };
    gameStateRef.current.clickCount = 0;
    setScore(0);
    setGameOver(false);
    spawnNewPiece();
  };

  const spawnNewPiece = () => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    gameStateRef.current.currentPiece = { shape, color };
    gameStateRef.current.currentPosition = { x: Math.floor(COLS / 2), y: 0 };
    
    if (checkCollision()) {
      setGameOver(true);
    }
  };

  const drawBoard = (ctx) => {
    const { board, currentPiece, currentPosition } = gameStateRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw board
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = value;
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      });
    });
    
    // Draw current piece
    if (currentPiece) {
      currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
          if (value !== 0) {
            ctx.fillStyle = currentPiece.color;
            ctx.fillRect(
              (currentPosition.x + dx) * BLOCK_SIZE, 
              (currentPosition.y + dy) * BLOCK_SIZE, 
              BLOCK_SIZE, 
              BLOCK_SIZE
            );
            ctx.strokeRect(
              (currentPosition.x + dx) * BLOCK_SIZE, 
              (currentPosition.y + dy) * BLOCK_SIZE, 
              BLOCK_SIZE, 
              BLOCK_SIZE
            );
          }
        });
      });
    }
  };

  const rotatePiece = () => {
    const { currentPiece } = gameStateRef.current;
    if (!currentPiece) return;

    const rotated = currentPiece.shape[0].map((_, i) => 
      currentPiece.shape.map(row => row[i]).reverse()
    );

    currentPiece.shape = rotated;
    if (!checkCollision()) {
      drawBoard(canvasRef.current.getContext('2d'));
    } else {
      // Revert rotation if collision detected
      currentPiece.shape = currentPiece.shape.map((_, i) => 
        currentPiece.shape.map(row => row[currentPiece.shape.length - 1 - i])
      );
    }
  };

  const moveDown = () => {
    const { currentPosition, currentPiece, board } = gameStateRef.current;
    
    currentPosition.y += 1;
    
    if (checkCollision()) {
      // Piece landed, lock it into place
      currentPosition.y -= 1;
      currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
          if (value !== 0) {
            board[currentPosition.y + dy][currentPosition.x + dx] = currentPiece.color;
          }
        });
      });

      // Clear completed lines
      let linesCleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          linesCleared++;
          y++; // Recheck this row
        }
      }

      // Update score
      if (linesCleared > 0) {
        setScore(prev => prev + [40, 100, 300, 1200][linesCleared - 1]);
      }

      // Spawn new piece
      spawnNewPiece();
    }
    
    drawBoard(canvasRef.current.getContext('2d'));
  };

  const movePieceHorizontal = (direction) => {
    const { currentPosition, currentPiece } = gameStateRef.current;
    
    currentPosition.x += direction;
    
    if (checkCollision()) {
      // Revert if collision detected
      currentPosition.x -= direction;
    }
    
    drawBoard(canvasRef.current.getContext('2d'));
  };

  const checkCollision = () => {
    const { board, currentPiece, currentPosition } = gameStateRef.current;
    
    return currentPiece.shape.some((row, dy) => 
      row.some((value, dx) => {
        if (value === 0) return false;
        
        const newX = currentPosition.x + dx;
        const newY = currentPosition.y + dy;
        
        return (
          newX < 0 || 
          newX >= COLS || 
          newY >= ROWS || 
          (newY >= 0 && board[newY][newX] !== 0)
        );
      })
    );
  };

  const handleMouseDown = (e) => {
    if (gameOver) {
      initializeGame();
      return;
    }

    const { currentPosition, currentPiece } = gameStateRef.current;
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Determine movement direction based on click position
    const direction = x < rect.width / 2 ? -1 : 1;
    
    // Increment click count for rotation
    gameStateRef.current.clickCount++;
    
    // Move piece or rotate
    if (gameStateRef.current.clickCount === 1) {
      // First click: move piece
      movePieceHorizontal(direction);
    } else if (gameStateRef.current.clickCount === 2) {
      // Second click: rotate piece
      rotatePiece();
      gameStateRef.current.clickCount = 0;
    }
    
    // Set up continuous movement
    gameStateRef.current.mouseDownDirection = direction;
    gameStateRef.current.mouseDownTimer = setInterval(() => {
      movePieceHorizontal(direction);
      moveDown();
    }, 200);
    
    moveDown();
    drawBoard(ctx);
  };

  const handleMouseUp = () => {
    if (gameStateRef.current.mouseDownTimer) {
      clearInterval(gameStateRef.current.mouseDownTimer);
      gameStateRef.current.mouseDownTimer = null;
      gameStateRef.current.mouseDownDirection = null;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    initializeGame();
    
    const ctx = canvas.getContext('2d');
    drawBoard(ctx);
    
    const gameLoop = setInterval(moveDown, 500);
    
    // Add event listeners for continuous movement
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      clearInterval(gameLoop);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleShare = () => {
    if (liff.isApiAvailable("shareTargetPicker")) {
      liff.shareTargetPicker([
        {
          "type": "flex",
          "altText": "シューティングゲームのスコアをシェア！",
          "contents": {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": "https://raw.githubusercontent.com/himanago/miniapp-handson/refs/heads/main/game_icon.png",
              "size": "full",
              "aspectRatio": "20:13",
              "aspectMode": "cover"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": `シューティングゲームで${score}点をとったよ！`,
                      "size": "lg",
                      "color": "#000000",
                      "weight": "bold",
                      "wrap": true
                    }
                  ],
                  "spacing": "none"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": "手軽に遊べるミニゲーム",
                      "size": "sm",
                      "color": "#999999",
                      "wrap": true
                    }
                  ],
                  "spacing": "none"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "button",
                      "action": {
                        "type": "uri",
                        "label": "遊んでみる！",
                        "uri": `https://miniapp.line.me/${liff.id}`
                      },
                      "style": "primary",
                      "height": "md",
                      "color": "#17c950"
                    },
                    {
                      "type": "button",
                      "action": {
                        "type": "uri",
                        "label": "シェアする",
                        "uri": `https://miniapp.line.me/${liff.id}/share`
                      },
                      "style": "link",
                      "height": "md",
                      "color": "#469fd6"
                    }
                  ],
                  "spacing": "xs",
                  "margin": "lg"
                }
              ],
              "spacing": "md"
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "separator",
                  "color": "#f0f0f0"
                },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "image",
                      "url": "https://raw.githubusercontent.com/himanago/miniapp-handson/refs/heads/main/game_icon.png",
                      "flex": 1,
                      "gravity": "center"
                    },
                    {
                      "type": "text",
                      "text": "シューティングゲーム",
                      "flex": 19,
                      "size": "xs",
                      "color": "#999999",
                      "weight": "bold",
                      "gravity": "center",
                      "wrap": false
                    },
                    {
                      "type": "image",
                      "url": "https://vos.line-scdn.net/service-notifier/footer_go_btn.png",
                      "flex": 1,
                      "gravity": "center",
                      "size": "xxs",
                      "action": {
                        "type": "uri",
                        "label": "action",
                        "uri": `https://miniapp.line.me/${liff.id}`
                      }
                    }
                  ],
                  "flex": 1,
                  "spacing": "md",
                  "margin": "md"
                }
              ]
            }
          }
        }
      ]).then(function (res) {
        if (res) {
          alert("シェアしました！");
        } else {
          alert("シェアをキャンセルしました。");
        }
      })
      .catch(function (error) {
        alert("エラーが発生しました。");
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <canvas 
        ref={canvasRef} 
        className="border-2 border-gray-300 cursor-pointer"
      />
      <div className="text-center">
        <p>Score: {score}</p>
        {gameOver && (
          <div>ゲームオーバー！クリックでリスタート<button onclick={handleShare}>シェア！</button></div>
        )}
        {gameOver && (
          <Button 
            onClick={initializeGame} 
            className="mt-2"
          >
            Restart Game
          </Button>
        )}
        <p className="text-sm text-gray-600 mt-2">
          ゲームの遊び方：左右クリックで移動、ダブルクリックで回転
        </p>
      </div>
    </div>
  );
};

export default Tetris;