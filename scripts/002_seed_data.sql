-- TheEndGame Seed Data
-- Sample challenges and test data for development

-- ==========================================
-- SAMPLE CHALLENGES
-- ==========================================

INSERT INTO challenges (question, correct_answer, explanation, category, subcategory, difficulty, tags, base_points, time_limit, is_verified, is_active) VALUES

-- Code challenges
('What is the time complexity of binary search?', 'O(log n)', 'Binary search halves the search space with each comparison, resulting in logarithmic time complexity.', 'code', 'algorithms', 'easy', ARRAY['algorithms', 'search', 'complexity'], 100, 30, true, true),

('What does the "yield" keyword do in Python?', 'Creates a generator function that can pause execution and return values one at a time', 'The yield keyword turns a function into a generator, allowing it to produce a sequence of values lazily, pausing between each yield.', 'code', 'python', 'medium', ARRAY['python', 'generators', 'functions'], 150, 45, true, true),

('Explain the difference between "==" and "===" in JavaScript.', '"==" performs type coercion before comparison, while "===" compares both value and type without coercion', 'The strict equality operator (===) checks both value and type, making it more predictable and preferred in most cases.', 'code', 'javascript', 'easy', ARRAY['javascript', 'operators', 'comparison'], 100, 30, true, true),

('What is a closure in programming?', 'A function that has access to variables from its outer (enclosing) scope, even after the outer function has returned', 'Closures allow functions to maintain access to their lexical scope, enabling patterns like data privacy and function factories.', 'code', 'concepts', 'medium', ARRAY['closures', 'scope', 'functions'], 150, 45, true, true),

('What is the CAP theorem in distributed systems?', 'A distributed system can only guarantee two of three properties: Consistency, Availability, and Partition tolerance', 'The CAP theorem states that in the presence of network partitions, a system must choose between consistency and availability.', 'code', 'distributed-systems', 'hard', ARRAY['distributed', 'databases', 'theory'], 200, 60, true, true),

-- Science challenges
('What is the speed of light in a vacuum?', 'Approximately 299,792,458 meters per second (or about 3 x 10^8 m/s)', 'The speed of light is a fundamental constant in physics, denoted as c, and is the maximum speed at which information can travel.', 'science', 'physics', 'easy', ARRAY['physics', 'constants', 'light'], 100, 30, true, true),

('Explain quantum entanglement in simple terms.', 'A phenomenon where two or more particles become correlated such that the quantum state of one instantly influences the other, regardless of distance', 'Entangled particles share a quantum state, so measuring one particle immediately determines the state of its partner, even across vast distances.', 'science', 'quantum-physics', 'hard', ARRAY['quantum', 'physics', 'entanglement'], 200, 60, true, true),

('What is CRISPR-Cas9?', 'A gene-editing technology that allows scientists to precisely modify DNA sequences in living organisms', 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) with Cas9 protein acts as molecular scissors to cut and edit DNA.', 'science', 'biology', 'medium', ARRAY['biology', 'genetics', 'technology'], 150, 45, true, true),

('What causes the Northern Lights (Aurora Borealis)?', 'Charged particles from the Sun interacting with gases in Earths atmosphere, guided by Earths magnetic field', 'Solar wind particles collide with atmospheric gases, causing them to emit light of various colors depending on the type of gas and altitude.', 'science', 'astronomy', 'medium', ARRAY['astronomy', 'atmosphere', 'magnetism'], 150, 45, true, true),

-- History challenges
('What year did World War II end?', '1945', 'WWII ended in 1945 with Germany surrendering in May (V-E Day) and Japan surrendering in September (V-J Day) after atomic bombs were dropped.', 'history', 'world-wars', 'easy', ARRAY['wwii', 'wars', '20th-century'], 100, 30, true, true),

('Who was the first person to circumnavigate the globe?', 'Ferdinand Magellans expedition (completed by Juan Sebastián Elcano after Magellans death)', 'While Magellan is often credited, he died in the Philippines. Elcano completed the voyage in 1522 with 18 surviving crew members.', 'history', 'exploration', 'medium', ARRAY['exploration', 'navigation', '16th-century'], 150, 45, true, true),

('What was the significance of the Rosetta Stone?', 'It enabled the decipherment of Egyptian hieroglyphics by providing the same text in three scripts: hieroglyphic, Demotic, and Greek', 'Discovered in 1799, the Rosetta Stone was key to understanding ancient Egyptian writing, finally decoded by Jean-François Champollion in 1822.', 'history', 'archaeology', 'medium', ARRAY['egypt', 'archaeology', 'linguistics'], 150, 45, true, true),

-- Logic challenges
('A farmer has 17 sheep. All but 9 die. How many sheep are left?', '9', 'The phrase "all but 9" means 9 sheep survived. This is a classic misdirection puzzle that tests careful reading.', 'logic', 'puzzles', 'easy', ARRAY['puzzles', 'wordplay', 'math'], 100, 30, true, true),

('If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?', '5 minutes', 'Each machine makes 1 widget in 5 minutes. With 100 machines working simultaneously, each makes 1 widget in 5 minutes = 100 widgets total.', 'logic', 'puzzles', 'medium', ARRAY['puzzles', 'math', 'reasoning'], 150, 45, true, true),

-- Philosophy challenges
('What is the trolley problem?', 'An ethical thought experiment about whether its morally permissible to sacrifice one person to save many', 'The trolley problem explores the tension between utilitarian ethics (greatest good) and deontological ethics (inherent rights).', 'philosophy', 'ethics', 'medium', ARRAY['ethics', 'thought-experiments', 'morality'], 150, 45, true, true),

('Explain Occams Razor.', 'The principle that the simplest explanation that fits the evidence is usually the correct one', 'Named after William of Ockham, this principle suggests not multiplying entities beyond necessity when explaining phenomena.', 'philosophy', 'logic', 'easy', ARRAY['logic', 'reasoning', 'principles'], 100, 30, true, true),

-- Technology challenges
('What is the difference between machine learning and deep learning?', 'Deep learning is a subset of machine learning that uses neural networks with multiple layers to learn hierarchical representations of data', 'While all deep learning is machine learning, deep learning specifically uses multi-layered neural networks that can learn increasingly abstract features.', 'technology', 'ai', 'medium', ARRAY['ai', 'ml', 'deep-learning'], 150, 45, true, true),

('What is blockchain consensus?', 'A mechanism by which all participants in a distributed network agree on the current state of the ledger without needing a central authority', 'Consensus algorithms like Proof of Work or Proof of Stake ensure all nodes maintain identical copies of the blockchain.', 'technology', 'blockchain', 'medium', ARRAY['blockchain', 'distributed', 'consensus'], 150, 45, true, true),

('What is Zero-Knowledge Proof?', 'A cryptographic method where one party can prove to another that a statement is true without revealing any information beyond the validity of the statement', 'ZK proofs enable privacy-preserving verification, useful in blockchain for private transactions and identity verification.', 'technology', 'cryptography', 'hard', ARRAY['cryptography', 'privacy', 'blockchain'], 200, 60, true, true),

-- Expert challenges
('Explain the P vs NP problem.', 'The question of whether every problem whose solution can be quickly verified can also be quickly solved', 'One of the Millennium Prize Problems, P vs NP asks if problems verifiable in polynomial time (NP) are also solvable in polynomial time (P).', 'code', 'theory', 'expert', ARRAY['complexity', 'theory', 'algorithms'], 300, 90, true, true),

('What is the Halting Problem and why is it unsolvable?', 'The problem of determining whether a given program will eventually halt or run forever; proven undecidable by Alan Turing using diagonalization', 'Turing proved no algorithm can exist that correctly determines for all program-input pairs whether the program halts, establishing fundamental limits of computation.', 'code', 'theory', 'expert', ARRAY['computability', 'theory', 'turing'], 300, 90, true, true)

ON CONFLICT DO NOTHING;
