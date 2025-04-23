INSERT INTO events (title, price, date, time, tags, description, image_url, stripe_link)
VALUES 
('Conference', 49.99, '2025-08-12', '09:00', ARRAY['tech', 'networking'], 'A conference for marketing recruit season', 'https://3ou0u5266t.ufs.sh/f/icFgxUjDNp9SuBS3zl7TFJPjsNlvdgVeB8Hyx01LD23IRiGo', 'https://stripe.com/en-ca'),
('Startup Pitch Night', 0.00, '2025-07-05', '18:30', ARRAY['startup', 'pitch'], 'Pitch your startup idea to investors', 'https://3ou0u5266t.ufs.sh/f/icFgxUjDNp9SuBS3zl7TFJPjsNlvdgVeB8Hyx01LD23IRiGo', 'https://stripe.com/en-ca'),
('Hackathon Weekend', 19.99, '2025-09-20', '10:00', ARRAY['hackathon', 'competition'], 'A full weekend hackathon event', 'https://3ou0u5266t.ufs.sh/f/icFgxUjDNp9STiRdQkKtWjXZ5CV1loKvErcSBGzukR43NPpY', 'https://stripe.com/en-ca');

INSERT INTO event_questions (event_id, question_text, question_type, required, sort_order)
VALUES 
(
  (SELECT id FROM events WHERE title = 'Tech Conference 2025' LIMIT 1),
  'What is your current role?', 
  'text', 
  TRUE, 
  1
),
(
  (SELECT id FROM events WHERE title = 'Tech Conference 2025' LIMIT 1),
  'Do you have any dietary restrictions?', 
  'text', 
  FALSE, 
  2
);

-- Insert questions for the second event (Startup Pitch Night)
INSERT INTO event_questions (event_id, question_text, question_type, required, sort_order)
VALUES 
(
  (SELECT id FROM events WHERE title = 'Startup Pitch Night' LIMIT 1),
  'What is the name of your startup?', 
  'text', 
  TRUE, 
  1
),
(
  (SELECT id FROM events WHERE title = 'Startup Pitch Night' LIMIT 1),
  'Are you looking for funding?', 
  'boolean', 
  TRUE, 
  2
);

-- Insert questions for the third event (Hackathon Weekend)
INSERT INTO event_questions (event_id, question_text, question_type, required, sort_order)
VALUES 
(
  (SELECT id FROM events WHERE title = 'Hackathon Weekend' LIMIT 1),
  'What programming languages do you use?', 
  'text', 
  TRUE, 
  1
),
(
  (SELECT id FROM events WHERE title = 'Hackathon Weekend' LIMIT 1),
  'Do you need a team?', 
  'boolean', 
  FALSE, 
  2
);
