// Dice utility class
class Dice {
    // Roll a single die with specified number of sides
    static roll(sides = 6) {
        return Math.floor(Math.random() * sides) + 1;
    }

    // Roll multiple dice and return the total
    static rollDice(count, sides = 6) {
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += this.roll(sides);
        }
        return total;
    }

    // Roll with modifier (e.g., 2d6+3)
    static rollWithModifier(diceString) {
        const match = diceString.match(/(\d*)d(\d+)([+-]\d+)?/);
        if (!match) return 0;

        const count = match[1] ? parseInt(match[1]) : 1;
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;

        return this.rollDice(count, sides) + modifier;
    }

    // Roll with stat modifier (e.g., roll with player's luck)
    static rollWithStat(statValue, bonusDice = 0) {
        const baseRoll = this.roll(20); // d20 for skill checks
        const bonusRoll = bonusDice > 0 ? this.rollDice(bonusDice, 6) : 0;
        return {
            total: baseRoll + statValue + bonusRoll,
            base: baseRoll,
            stat: statValue,
            bonus: bonusRoll
        };
    }
}

// Dice UI Component
const DiceUI = {
    // Show dice roll animation and result
    async roll(container, options = {}) {
        const { sides = 6, modifier = 0, stat, statName } = options;
        const diceElement = document.createElement('div');
        diceElement.className = 'dice-rolling';
        diceElement.textContent = '...';
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(diceElement);
        }

        // Add rolling animation
        return new Promise(resolve => {
            const rollDuration = 1000; // 1 second rolling animation
            const startTime = Date.now();
            const rollInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= rollDuration) {
                    clearInterval(rollInterval);
                    const result = Dice.roll(sides) + modifier;
                    diceElement.className = 'dice-result';
                    diceElement.textContent = result;
                    
                    if (stat !== undefined) {
                        const total = result + stat;
                        diceElement.textContent += ` + ${stat}${statName ? ` (${statName})` : ''} = ${total}`;
                        resolve(total);
                    } else {
                        resolve(result);
                    }
                } else {
                    // Show random numbers while rolling
                    diceElement.textContent = Math.floor(Math.random() * sides) + 1;
                }
            }, 50);
        });
    },

    // Create a roll button
    createRollButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'dice-button';
        button.textContent = text || '🎲 Roll Dice';
        button.addEventListener('click', onClick);
        return button;
    },

    // Create a container for dice results
    createResultContainer() {
        const container = document.createElement('div');
        container.className = 'dice-result-container';
        return container;
    }
};

// Add dice styles
const style = document.createElement('style');
style.textContent = `
.dice-button {
    padding: 8px 16px;
    font-size: 16px;
    background: linear-gradient(145deg, #4a6bdf, #3a56c4);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: all 0.2s;
}

.dice-button:hover {
    background: linear-gradient(145deg, #3a56c4, #2a46a9);
    transform: translateY(-2px);
}

.dice-button:active {
    transform: translateY(1px);
}

.dice-rolling {
    display: inline-block;
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin: 10px;
    padding: 10px 20px;
    background: #f0f0f0;
    border-radius: 8px;
    min-width: 60px;
    text-align: center;
    animation: pulse 0.5s infinite;
}

.dice-result {
    display: inline-block;
    font-size: 24px;
    font-weight: bold;
    color: #2e7d32;
    margin: 10px;
    padding: 10px 20px;
    background: #e8f5e9;
    border: 2px solid #2e7d32;
    border-radius: 8px;
    min-width: 60px;
    text-align: center;
    animation: pop 0.3s;
}

.dice-result-container {
    margin: 10px 0;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 8px;
    border-left: 4px solid #4a6bdf;
}

@keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

@keyframes pop {
    0% { transform: scale(0.9); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
`;

document.head.appendChild(style);

// Make Dice and DiceUI available globally
window.Dice = Dice;
window.DiceUI = DiceUI;
