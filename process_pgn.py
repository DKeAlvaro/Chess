import sys
import chess.pgn
import numpy as np
import joblib
from tensorflow.keras.models import load_model


def piece_to_value(piece):
    if piece is None:
        return 0
    piece_type = piece.piece_type
    return piece_type if piece.color == chess.WHITE else -piece_type

def board_to_vector(board):
    return [piece_to_value(board.piece_at(i)) for i in range(64)]

def game_outcome(game):
    result = game.headers["Result"]
    if result == '1-0':
        return 1  # White wins
    elif result == '0-1':
        return -1 # Black wins
    else:
        return 0  # Draw

def is_valid_elo(elo_str):
    try:
        int(elo_str)
        return True
    except ValueError:
        return False

def game_to_vector(game):
    # Check if Elo ratings are valid
    white_elo_str = game.headers.get("WhiteElo", "")
    black_elo_str = game.headers.get("BlackElo", "")

    if not (is_valid_elo(white_elo_str) and is_valid_elo(black_elo_str)):
        return None  # Skip the game if either Elo rating is invalid

    board = game.board()
    game_vector = []

    outcome = game_outcome(game)
    white_elo = int(white_elo_str)
    black_elo = int(black_elo_str)

    for move in game.mainline_moves():
        board.push(move)
        game_vector.extend(board_to_vector(board))

    if len(game_vector) < 6400:
        game_vector.extend([-10] * (6400 - len(game_vector)))

    game_vector = [outcome, white_elo, black_elo] + game_vector

    return game_vector

def load_and_predict(model_path, scaler_path, pgn_file):
    model = load_model(model_path)

    scaler = joblib.load(scaler_path)

    input_data = game_to_vector(pgn_file)

    X = np.array(input_data[3:]) 
    X = scaler.transform(X.reshape(1, -1))

    predictions = model.predict(X)

    print(f"Elo: {predictions[0][0]}")

def process_pgn(file_path, model_path, scaler_path):
    try:
        with open(file_path, 'r') as file:
            game = chess.pgn.read_game(file)
            if game:
                load_and_predict(model_path, scaler_path, game)
            else:
                print("No valid game found in the PGN file.")
    except Exception as e:
        print(f"Error processing PGN file: {e}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_pgn.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    model_path = "linear_regression_elo_predictor.h5"
    scaler_path = "scaler.joblib"
    process_pgn(file_path, model_path, scaler_path)
