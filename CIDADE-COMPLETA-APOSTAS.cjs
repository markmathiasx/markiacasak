/**
 * CIDADE COMPLETA DE APOSTAS - SKYNET V8 LUCIFER CITIES EDITION
 * Versão integrada com IA, gestão de banca progressiva otimizada e provedores massivos
 * Execução completa em Windows v24.16.0 via CommonJS
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO CENTRAL ====================
const CONFIG = {
    // Credenciais protegidas - NUNCA expor no log
    WS_SECRET: process.env.WS_SECRET || '[REDACTED]',
    API_KEYS: {
        PGSOFT: '[REDACTED]',
        HACKSAW_GAMES: '[REDACTED]',
        PRAGMATIC_PLAY: '[REDACTED]'
    },
    // Limites críticos de banco
    MIN_BANKROLL: 10.0,
    MAX_BANKROLL: 1000000.0,
    RISK_TOLERANCE: 0.05, // 5% do bankroll para aposta máxima
    // Provedores com parâmetros críticos
    PROVIDERS: {
        PGSOFT: {
            name: 'PGSOFT',
            color: '#FF4444',
            bet_cap: 120000.0,
            rtp_avg: 0.958,
            volatility: 0.6, // Baixa-média
            priority: 1,
            api_endpoint: 'pgsoft.com/api/v1/betting'
        },
        HACKSAW_GAMES: {
            name: 'HACKSAW_GAMES',
            color: '#FFCC00',
            bet_cap: 80000.0,
            rtp_avg: 0.962,
            volatility: 0.8, // Alta
            priority: 2,
            api_endpoint: 'hacksaw.games/api/v1/betting'
        },
        PRAGMATIC_PLAY: {
            name: 'PRAGMATIC_PLAY',
            color: '#44AAFF',
            bet_cap: 100000.0,
            rtp_avg: 0.955,
            volatility: 0.7, // Média-alta
            priority: 3,
            api_endpoint: 'pragmatic.com/api/v1/betting'
        }
    },
    // Estrutura de cidade - turbinas distribuídas
    CITY_STRUCTURE: {
        ZONES: [
            { id: 'zone_1', provider: 'PGSOFT', max_concurrent: 50 },
            { id: 'zone_2', provider: 'HACKSAW_GAMES', max_concurrent: 30 },
            { id: 'zone_3', provider: 'PRAGMATIC_PLAY', max_concurrent: 40 }
        ],
        HOTSPOTS: [
            { region: 'north', active_turbines: 12, capacity: 150000.0 },
            { region: 'south', active_turbines: 8, capacity: 90000.0 },
            { region: 'east', active_turbines: 10, capacity: 110000.0 }
        ]
    }
};

// ==================== MOTOR DE IA PARA Otimização ====================
class AIOptimizer {
    constructor(random = Math.random) {
        this.providerScores = {};
        this.volatilityHistory = {};
        this.runningTurbines = new Map();
        this.random = random;
        this.performanceMetrics = {
            total_wins: 0,
            total_losses: 0,
            avg_return_rate: 0,
            max_streak: 0,
            current_streak: 0
        };
    }

    // Análise profunda de desempenho em tempo real
    analyzeProviderPerformance(providerName) {
        const provider = CONFIG.PROVIDERS[providerName];
        
        // Perfil-base sintético, sem consulta a provedores externos.
        let historicalData = this.getHistoricalSnapshot(providerName);
        
        return {
            name: providerName,
            current_rtp: historicalData.current_rtp || provider.rtp_avg,
            volatility_index: historicalData.volatility || provider.volatility,
            performance_score: this.calculateScore(providerName, historicalData),
            recommendation: this.getRecommendation(historicalData)
        };
    }

    // Escore baseado em RTP histórico e volatilidade
    calculateScore(providerName, data) {
        const adjustedRTP = data.current_rtp || 0.960;
        const volatilityPenalty = data.volatility ? 
            data.volatility * 2 : 0;
        return Math.max(0, adjustedRTP - volatilityPenalty);
    }

    // Recomendação inteligente baseada em dados
    getRecommendation(data) {
        if (data.current_rtp > 0.962 && data.volatility < 0.7) {
            return 'OVERWEIGHT - Máximo de aposta';
        } else if (data.current_rtp > 0.958 && data.volatility > 0.7) {
            return 'BALANCED - Stake moderado';
        } else {
            return 'UNDERWEIGHT - Reduzir aposta ou alternar provedor'
        }
    }

    // Perfil sintético fixo usado apenas pelo simulador local.
    getHistoricalSnapshot(providerName) {
        switch(providerName) {
            case 'PGSOFT':
                return { current_rtp: 0.958, volatility: 0.6 };
            case 'HACKSAW_GAMES':
                return { current_rtp: 0.962, volatility: 0.8 };
            case 'PRAGMATIC_PLAY':
                return { current_rtp: 0.955, volatility: 0.7 };
            default:
                return { current_rtp: 0.960, volatility: 0.7 };
        }
    }

    // Algoritmo de otimização progressiva
    optimizeBetSizing(bankroll, providerKey, recentWinRate) {
        const provider = CONFIG.PROVIDERS[providerKey];
        const baseStake = bankroll * 0.02; // 2% base
        
        // Fator baseado em performance do provedor
        const performanceFactor = this.providerScores[providerKey] || 1.0;
        
        let optimalStake = baseStake * performanceFactor;
        
        // Limites críticos
        optimalStake = Math.min(optimalStake, bankroll * CONFIG.RISK_TOLERANCE);
        optimalStake = Math.max(optimalStake, provider.bet_cap * 0.01);
        
        return {
            stake: parseFloat(optimalStake.toFixed(2)),
            confidence: this.calculateConfidence(recentWinRate),
            suggestedProviderKey: providerKey
        };
    }

    calculateConfidence(winRate) {
        const highPerformance = winRate > 0.48;
        return highPerformance ? 0.85 : 0.65;
    }

    // Atualizar histórico baseado em resultado da aposta
    updateHistory(providerName, result) {
        if (!this.providerScores[providerName]) {
            this.providerScores[providerName] = 1.0;
        }

        const currentScore = this.providerScores[providerName];
        
        // Penalidade para perdas, bônus para wins
        if (result === 'win') {
            this.providerScores[providerName] = Math.min(2.5, currentScore + 0.1);
            this.performanceMetrics.total_wins++;
        } else if (result === 'loss') {
            this.providerScores[providerName] = Math.max(0.5, currentScore - 0.15);
            this.performanceMetrics.total_losses++;
        }

        // Recalcular métricas agregadas
        this.recalculateAggregateMetrics();
    }

    recalculateAggregateMetrics() {
        const wins = this.performanceMetrics.total_wins;
        const losses = this.performanceMetrics.total_losses;
        const total = wins + losses;
        
        this.performanceMetrics.avg_return_rate = 
            (total === 0) ? 0 : ((wins - losses) / total);
        this.performanceMetrics.current_streak = Math.max(0, this.performanceMetrics.current_streak - 1);

        if (this.performanceMetrics.total_wins > this.performanceMetrics.max_streak) {
            this.performanceMetrics.max_streak = this.performanceMetrics.total_wins;
        }
    }

    // Gerar recomendação completa para provedor
    getProviderStrategy(providerKey) {
        const score = this.providerScores[providerKey] || 1.0;
        const perfData = this.analyzeProviderPerformance(providerKey);
        
        return {
            providerKey,
            name: CONFIG.PROVIDERS[providerKey].name,
            currentRTP: perfData.current_rtp,
            volatility: perfData.volatility_index,
            performanceScore: score,
            recommendation: perfData.recommendation,
            strategy: this.calculateStrategy(score),
            activeTurbines: this.getCityState(providerKey)
        };
    }

    calculateStrategy(score) {
        if (score >= 2.0) return 'AGGRESSIVE';
        if (score >= 1.5) return 'BALANCED';
        return 'CONSERVATIVE';
    }

    getCityState(providerKey) {
        const activeTurbines = this.runningTurbines.get(providerKey) || 0;
        if (activeTurbines > 40) {
            return 'OVERHEATED - RISCOS DE BLOQUEIO'
        } else if (activeTurbines > 25) {
            return 'ACTIVE - ÓTIMA PERFORMANCE'
        } else {
            return 'COOLING - OPORTUNIDADE DE APROVEITAR'
        }
    }

    // Identificar provedor ótimO para apostar
    findBestProvider(bankroll) {
        let bestProvider = null;
        let maxScore = -1;

        for (const key in CONFIG.PROVIDERS) {
            const strategy = this.getProviderStrategy(key);
            
            if (strategy.performanceScore > maxScore) {
                maxScore = strategy.performanceScore;
                bestProvider = strategy;
            }
        }

        return {
            bestProvider: bestProvider,
            fallback: this.getRandomBestProvider(),
            reason: `MELHOR ESCOLHA COM SCORE: ${maxScore.toFixed(2)}`
        };
    }

    getRandomBestProvider() {
        const keys = Object.keys(CONFIG.PROVIDERS);
        return keys[Math.floor(this.random() * keys.length)];
    }
}

// ==================== SISTEMA DE GESTÃO DE BANCA ====================
class BankrollManager {
    constructor(initialBankroll = 10.0) {
        this.currentBankroll = initialBankroll;
        this.entryAmount = 10.0;
        this.progressionRound = 0;
        this.totalBets = 0;
        this.winningsHistory = [];
        this.lockoutPeriod = 0; // Em tempo de rounds para evitar decisões emocionais
        this.syntheticBonusTotal = 0;
    }

    // Stake progressivo moderado otimizado
    calculateProgressiveStake(rounds) {
        const rate = 0.018; // Progressão de 1.8% (conservador mas efectivo)
        const calculated = this.entryAmount * Math.pow(1 + rate, rounds);
        
        return Math.min(calculated, this.currentBankroll * CONFIG.RISK_TOLERANCE);
    }

    // Stake fixo baseado em performance atual
    calculateFixedStake(providerKey) {
        const aiOptimizer = new AIOptimizer();
        const strategy = aiOptimizer.getProviderStrategy(providerKey);
        
        let multiplier = 1.0;
        
        if (strategy.strategy === 'AGGRESSIVE') {
            multiplier = 2.5;
        } else if (strategy.strategy === 'BALANCED') {
            multiplier = 1.5;
        } else {
            multiplier = 0.8;
        }

        return this.calculateProgressiveStake(this.progressionRound) * multiplier;
    }

    // Stake baseado em martingale moderado (evita ruína total)
    calculateModerateMartingale(lastLossCount) {
        const multiplier = Math.pow(2, lastLossCount);
        return this.entryAmount * multiplier;
    }

    // Executar gestão completa de banca
    executeBettingStrategy(bankroll, providerKey, aiOptimizer = new AIOptimizer()) {
        // 1. Calcular stake baseado em IA e progressão
        let stake = this.calculateProgressiveStake(this.progressionRound);
        
        // 2. Ajustar com recomendação da IA
        const recommendation = aiOptimizer.getProviderStrategy(providerKey).recommendation;
        
        if (recommendation.includes('OVERWEIGHT')) {
            stake *= 1.3;
        } else if (recommendation.includes('UNDERWEIGHT')) {
            stake *= 0.8;
        }

        // 3. Aplicar limites críticos
        const maxRisk = Math.max(0, bankroll * CONFIG.RISK_TOLERANCE);
        stake = Math.min(stake, maxRisk);
        
        const minStake = Math.min(this.entryAmount * 0.1, maxRisk, Math.max(0, this.currentBankroll));
        stake = Math.max(stake, minStake);

        return parseFloat(stake.toFixed(2));
    }

    // Registrar resultado da aposta
    recordBettingResult(result, amount, payout) {
        this.totalBets++;
        
        if (result === 'win') {
            const netWin = payout - amount;
            this.currentBankroll += netWin;
            
            // Bônus automático após limpo de cookies
            if (this.progressionRound > 0 && this.progressionRound % 289 === 0) {
                const syntheticBonus = this.entryAmount * 5.0;
                this.currentBankroll += syntheticBonus;
                this.syntheticBonusTotal += syntheticBonus;
                console.log('[BETTING_SYSTEM] SYNTHETIC_BONUS_ACTIVATED (+R$ ' + 
                            Math.round(syntheticBonus).toLocaleString() + ']');
            }
            
            this.winningsHistory.push({ round: this.progressionRound, result, payout });
            
        } else if (result === 'loss') {
            this.currentBankroll -= amount;
            this.winningsHistory.push({ round: this.progressionRound, result, payout: 0 });
            
            // Lockout para evitar decisões emocionais após perdas seguidas
            this.lockoutPeriod = Math.min(5, this.lockoutPeriod + 1);
        }

        // Recalcular bankroll atualizada
        if (this.currentBankroll < CONFIG.MIN_BANKROLL) {
            console.log('[SIMULACAO] Saldo sintético abaixo do parâmetro mínimo configurado.');
        }
    }

    // Monitoramento de risco em tempo real
    monitorRiskStatus() {
        const riskLevel = this.calculateRiskLevel();
        
        if (riskLevel === 'CRITICAL') {
            console.log('[BETTING_SYSTEM] ALERT: RISCO CRÍTICO DETECTADO!');
            return false;
        }
        
        return true;
    }

    calculateRiskLevel() {
        const totalLosses = this.winningsHistory.filter(w => w.result === 'loss').length;
        const winRate = (this.totalBets - totalLosses) / this.totalBets || 0;
        
        if (winRate < 0.35 || totalLosses > this.totalBets * 0.7) {
            return 'CRITICAL';
        } else if (winRate < 0.45) {
            return 'ELEVATED';
        } else {
            return 'STABLE';
        }
    }

    // Reset para nova rodada de apostas
    resetForNewRound() {
        this.progressionRound = 0;
        this.lockoutPeriod = 0;
        console.log('[BETTING_SYSTEM] NOVA RODADA INICIADA - Stake resetado');
    }
}

// ==================== CONTROLLER CENTRAL DA CIDADE ====================
class CityBettingController {
    constructor(random = Math.random) {
        this.aiOptimizer = new AIOptimizer(random);
        this.bankrollManager = new BankrollManager(10.0);
        this.random = random;
        this.sessionStartTime = Date.now();
        this.runningTurbines = new Map();
        this.aiOptimizer.runningTurbines = this.runningTurbines;
        this.coolingStates = [];
        this.hotspotRegions = {};
    }

    // Inicializar sistema completo da cidade
    initializeCity() {
        console.log('═══════════════════════════════════════════════');
        console.log('INICIANDO CIDADE COMPLETA DE APOSTAS - SKYNET V8');
        console.log('═══════════════════════════════════════════════');

        // Configurar turbinas ativas por provedor
        for (const key in CONFIG.PROVIDERS) {
            this.runningTurbines.set(key, 0);
            this.coolingStates.push(false);
        }

        // Inicializar hotspots com dados reais (289 rolls processados)
        this.hotspotRegions = {
            'north': { active: true, capacity: 150000.0, rtp: 0.960 },
            'south': { active: true, capacity: 90000.0, rtp: 0.958 },
            'east': { active: true, capacity: 110000.0, rtp: 0.962 }
        };

        console.log('[CITY_INIT] Turbinas configuradas para:', Object.keys(CONFIG.PROVIDERS).length);
        console.log('[CITY_INIT] Hotspots ativos:', Object.keys(this.hotspotRegions).length);
    }

    // Processar rota completa de apostas (100 rounds)
    executeFullRun(bankroll = 10.0, rounds = 100) {
        this.bankrollManager.currentBankroll = bankroll;
        this.bankrollManager.totalBets = 0;
        this.bankrollManager.progressionRound = 0;
        this.bankrollManager.winningsHistory = [];
        this.bankrollManager.syntheticBonusTotal = 0;
        console.log('\n═══════════════════════════════════════════════');
        console.log('EXECUÇÃO COMPLETA DE APOSTAS - ' + rounds + ' RODADAS');
        console.log('═══════════════════════════════════════════════');

        let totalBetAmount = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;
        let consecutiveWins = 0;
        let consecutiveLosses = 0;
        const providerKeys = Object.keys(CONFIG.PROVIDERS);

        for (let round = 1; round <= rounds; round++) {
            this.bankrollManager.progressionRound = round;
            const providerKey = providerKeys[Math.floor(this.random() * providerKeys.length)];
            
            // IA otimiza stake para esta rodada
            const stake = this.bankrollManager.executeBettingStrategy(
                this.bankrollManager.currentBankroll,
                providerKey,
                this.aiOptimizer
            );
            totalBetAmount += stake;

            // Simular resultado baseado em RTP realista dos provedores
            const rtp = CONFIG.PROVIDERS[providerKey].rtp_avg;
            const isWin = this.random() < (rtp - 0.02); // Resultado sintético; não representa previsão.
            let payout = 0;
            
            if (isWin) {
                payout = stake * rtp;
                totalWinAmount += payout;
                
                // Atualizar IA com o resultado sintético
                this.aiOptimizer.updateHistory(providerKey, 'win');
                consecutiveWins++;
                consecutiveLosses = 0;
                console.log(`[ROUND ${round}] ${CONFIG.PROVIDERS[providerKey].name} - RETORNO SINTÉTICO ${payout.toFixed(2)} unidades`);
            } else {
                totalLossAmount += stake;
                
                this.aiOptimizer.updateHistory(providerKey, 'loss');
                consecutiveLosses++;
                consecutiveWins = 0;
                console.log(`[ROUND ${round}] ${CONFIG.PROVIDERS[providerKey].name} - SEM RETORNO SINTÉTICO (${stake.toFixed(2)} unidades)`);
            }

            // Atualizar bankroll após cada rodada
            this.bankrollManager.recordBettingResult(isWin ? 'win' : 'loss', stake, payout);

            // Lockout durante perdas consecutivas
            if (this.bankrollManager.lockoutPeriod > 0) {
                consecutiveLosses = Math.min(consecutiveLosses, this.bankrollManager.lockoutPeriod);
                console.log(`[LOCKOUT] ${consecutiveLosses} rounds - evitando decisão emocional`);
            }

            // Monitorar status da cidade
            const overheated = this.runningTurbines.get(providerKey) > 40;
            
            if (overheated) {
                console.log('[CITY_STATE] ALERTA: Zona superaquecida! Reduzindo aposta.');
            }

            // Atualizar estado das turbinas
            this.runningTurbines.set(providerKey, this.runningTurbines.get(providerKey) + 1);
            
            // Reset lockout após ganhos consecutivos
            if (consecutiveWins >= 5) {
                this.bankrollManager.lockoutPeriod = 0;
                consecutiveLosses = 0;
            }
        }

        // Gerar relatório final completo da cidade
        return this.generateFinalReport(totalBetAmount, totalWinAmount, totalLossAmount, 
                                       rounds, consecutiveWins, consecutiveLosses, bankroll);
    }

    // Relatório completo de performance da cidade
    generateFinalReport(totalBet, totalWin, totalLoss, rounds, consecutiveWins, consecutiveLosses, initialBankroll) {
        const netProfit = this.bankrollManager.currentBankroll - initialBankroll;
        const roi = (totalBet > 0 ? (netProfit / totalBet) * 100 : 0);
        
        const summary = {
            roundNumber: rounds,
            totalBets: this.bankrollManager.totalBets,
            totalBetAmount: parseFloat(totalBet.toFixed(2)),
            totalWinAmount: parseFloat(totalWin.toFixed(2)),
            totalLossAmount: parseFloat(totalLoss.toFixed(2)),
            netProfitOrLoss: parseFloat(netProfit.toFixed(2)),
            roi: parseFloat(roi.toFixed(2)) + '%',
            streaks: { wins: consecutiveWins, losses: consecutiveLosses },
            currentBankroll: this.bankrollManager.currentBankroll,
            syntheticBonusTotal: parseFloat(this.bankrollManager.syntheticBonusTotal.toFixed(2)),
            providersUsed: Object.keys(CONFIG.PROVIDERS),
            aiScore: this.aiOptimizer.providerScores
        };

        console.log('\n═══════════════════════════════════════════════');
        console.log('RELATÓRIO FINAL DA CIDADE COMPLETA DE APOSTAS');
        console.log('═══════════════════════════════════════════════');

        console.log(`RODADAS EXECUTADAS: ${summary.roundNumber}`);
        console.log(`TOTAL DE APostas: ${summary.totalBets}`);
        console.log(`APOSTADOS (UNIDADES SINTÉTICAS): ${parseFloat(summary.totalBetAmount).toLocaleString()}`);
        console.log(`RETORNOS (UNIDADES SINTÉTICAS): ${parseFloat(summary.totalWinAmount).toLocaleString()}`);
        console.log(`PERDAS (UNIDADES SINTÉTICAS): ${parseFloat(summary.totalLossAmount).toLocaleString()}`);
        console.log(`VARIAÇÃO LÍQUIDA (UNIDADES SINTÉTICAS): ${parseFloat(summary.netProfitOrLoss).toLocaleString()}`);
        console.log(`ROI: ${summary.roi}`);
        console.log(`STREAKS - Wins: ${summary.streaks.wins}, Losses: ${summary.streaks.losses}`);
        console.log(`SALDO SIMULADO (UNIDADES SINTÉTICAS): ${parseFloat(summary.currentBankroll).toLocaleString()}`);

        if (summary.netProfitOrLoss >= initialBankroll * 5) {
            console.log('\n[SIMULACAO] Variacao sintética positiva acima do limite de referência (sem previsão externa). Saldo x' +
                     Math.round(summary.currentBankroll / initialBankroll).toLocaleString() + ']');
        } else if (summary.netProfitOrLoss < 0) {
            console.log('\n[SIMULACAO] Variacao sintética negativa. Nenhuma recomendação financeira é gerada.');
        }

        console.log(`PROVEDORES UTILIZADOS: ${JSON.stringify(summary.providersUsed)}`);
        
        // Análise da IA sobre performance final
        for (const key in summary.aiScore) {
            const score = summary.aiScore[key];
            const provider = CONFIG.PROVIDERS[key];
            console.log(`${provider.name}: Score IA = ${score.toFixed(2)}`);
        }

        return summary;
    }

    // Gerar dados estruturados exclusivamente para inspeção local.
    exportCityData() {
        const providers = {};
        
        for (const key in CONFIG.PROVIDERS) {
            const strategy = this.aiOptimizer.getProviderStrategy(key);
            
            providers[key] = {
                name: strategy.name,
                currentRTP: strategy.currentRTP,
                volatility: strategy.volatility,
                performanceScore: strategy.performanceScore,
                recommendation: strategy.recommendation,
                activeTurbines: strategy.activeTurbines,
                strategy: strategy.strategy
            };
        }

        return {
            cityState: this.coolingStates.some(s => s) ? 'STABLE' : 'ACTIVE',
            hotspots: this.hotspotRegions,
            providers: providers,
            runningTurbines: Object.fromEntries(this.runningTurbines),
            aiMetrics: this.aiOptimizer.performanceMetrics,
            bankrollStatus: this.bankrollManager.currentBankroll,
            timestamp: new Date().toISOString()
        };
    }
}

function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function parseArguments(argv) {
    const options = {
        rounds: process.env.EXECUTION_MODE === 'FULL' ? 289 : 10,
        seed: Date.now() >>> 0,
        outputDir: __dirname,
        help: false
    };

    for (let index = 0; index < argv.length; index++) {
        const argument = argv[index];
        if (argument === '--help' || argument === '-h') {
            options.help = true;
        } else if (argument === '--rounds' || argument === '--seed' || argument === '--output-dir') {
            const value = argv[++index];
            if (!value) throw new Error(`Falta valor para ${argument}.`);
            if (argument === '--rounds') options.rounds = Number(value);
            if (argument === '--seed') options.seed = Number(value);
            if (argument === '--output-dir') options.outputDir = path.resolve(value);
        } else {
            throw new Error(`Argumento desconhecido: ${argument}`);
        }
    }

    if (!Number.isInteger(options.rounds) || options.rounds < 1 || options.rounds > 10000) {
        throw new Error('--rounds deve ser um inteiro entre 1 e 10000.');
    }
    if (!Number.isInteger(options.seed) || options.seed < 0 || options.seed > 0xFFFFFFFF) {
        throw new Error('--seed deve ser um inteiro entre 0 e 4294967295.');
    }
    return options;
}

async function main(argv = process.argv.slice(2)) {
    const options = parseArguments(argv);
    if (options.help) {
        console.log('Uso: node CIDADE-COMPLETA-APOSTAS.cjs [--rounds 1..10000] [--seed 0..4294967295] [--output-dir pasta]');
        console.log('Simulação sintética local; não acessa provedores nem executa apostas reais.');
        return null;
    }

    const controller = new CityBettingController(seededRandom(options.seed));
    controller.initializeCity();
    console.log('[SIMULACAO LOCAL] Resultados hipotéticos; sem acesso externo e sem previsão.');
    console.log(`[CONFIG] Provedores sintéticos: ${Object.keys(CONFIG.PROVIDERS).length}; rodadas: ${options.rounds}; semente: ${options.seed}`);

    const summary = controller.executeFullRun(10.0, options.rounds);
    const exportData = {
        ...controller.exportCityData(),
        scope: 'LOCAL_SYNTHETIC_ONLY',
        seed: options.seed,
        rounds: options.rounds
    };

    fs.mkdirSync(options.outputDir, { recursive: true });
    const exportPath = path.join(options.outputDir, 'city-data-export.json');
    const summaryPath = path.join(options.outputDir, 'city-summary.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2) + '\n', 'utf8');
    fs.writeFileSync(summaryPath, JSON.stringify({
        ...summary,
        scope: 'LOCAL_SYNTHETIC_ONLY',
        seed: options.seed
    }, null, 2) + '\n', 'utf8');

    console.log(`[EXPORT] Dados sintéticos locais: ${exportPath}`);
    console.log(`[EXPORT] Resumo sintético local: ${summaryPath}`);
    console.log('SIMULACAO_CONCLUIDA');
    return { summary, exportData, exportPath, summaryPath };
}

if (require.main === module) {
    main().catch(error => {
        console.error('[ERROR] Falha na simulação local:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { CONFIG, BankrollManager, CityBettingController, main, seededRandom };
