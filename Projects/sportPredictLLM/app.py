import os
from flask import Flask, render_template
from models import db, Pick
import ingest
from dotenv import load_dotenv
from datetime import date

# Load the secrets BEFORE creating the app
load_dotenv()

app = Flask(__name__)

# LOGIC: Use the Cloud DB if available, otherwise local file
uri = os.getenv("DATABASE_URL")  # Get the string from .env
if uri and uri.startswith("postgres://"):
    # Fix for some platforms that use 'postgres' instead of 'postgresql'
    uri = uri.replace("postgres://", "postgresql://", 1)
    
app.config['SECRET_KEY'] = 'dev-key-secret'
app.config['SQLALCHEMY_DATABASE_URI'] = uri or 'sqlite:///sports.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

#Calculates total profit
def calculate_profit(picks):
    balance = 0
    bet_amount = 10 

    for p in picks:
        if p.result == 'LOSS':
            balance -= bet_amount
        elif p.result == 'WIN':
            try:
                # Convert string odds (e.g. "+150", "-110") to integer
                odds = float(p.price)
                if odds > 0:
                    # Positive Odds (e.g. +150): Profit = Bet * (Odds/100)
                    profit = bet_amount * (odds / 100)
                else:
                    # Negative Odds (e.g. -110): Profit = Bet * (100/abs(Odds))
                    profit = bet_amount * (100 / abs(odds))
                balance += profit
            except:
                pass
    return round(balance, 2)

@app.route('/')
def index():
    # Fetch all PENDING picks for the homepage
    picks = Pick.query.filter_by(result="PENDING").order_by(Pick.date.asc()).all()
    curr_Date= date.today()
    curr_Date = curr_Date.strftime("%m/%d/%y")
    return render_template('index.html', picks=picks, curr_Date=curr_Date)

@app.route('/stats')
def stats():
    # 1. Fetch all COMPLETED picks (Win or Loss)
    completed_picks = Pick.query.filter(Pick.result!="PENDING").order_by(Pick.date.desc()).all()
    
    # 2. Calculate Stats
    total_bets = len(completed_picks)
    wins = len([p for p in completed_picks if p.result == 'WIN'])
    losses = len([p for p in completed_picks if p.result == 'LOSS'])
    
    if total_bets > 0:
        win_rate = round((wins / total_bets) * 100, 1)
        loss_rate = round((losses / total_bets) * 100, 1)
    else:
        win_rate = 0
        loss_rate = 0
        
    # 3. Calculate Money
    total_profit = calculate_profit(completed_picks)

    return render_template("stats.html", 
                         picks=completed_picks, 
                         win_rate=win_rate, 
                         loss_rate=loss_rate, 
                         profit=total_profit)

@app.route('/about')
def about():
    curr_model= ingest.current_model
    curr_sports= ingest.active_sports_names
    curr_markets= ingest.market_names
    return render_template("about.html", curr_model=curr_model, curr_sports= curr_sports,curr_markets=curr_markets)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)