-- Пробные данные для MS Access (INSERT)

INSERT INTO Clients (FullName, Phone, Email) VALUES
 ('Иван Петров', '+7 900 000-00-01', 'ivan@example.com'),
 ('Мария Смирнова', '+7 900 000-00-02', 'maria@example.com');

INSERT INTO Employees (FullName, Role, Phone, HireDate) VALUES
 ('Олег Кузнецов', 'Официант', '+7 900 111-11-11', NOW()),
 ('Анна Орлова', 'Хостес', '+7 900 222-22-22', NOW());

INSERT INTO Tables (TableNumber, Capacity, Zone) VALUES
 ('T1', 2, 'Зал'), ('T2', 4, 'Зал'), ('V1', 6, 'VIP');

INSERT INTO MenuCategories (CategoryName) VALUES
 ('Горячее'), ('Салаты'), ('Напитки');

INSERT INTO MenuItems (CategoryID, ItemName, Price) VALUES
 (1, 'Стейк', 950.00), (2, 'Цезарь', 450.00), (3, 'Эспрессо', 150.00);

-- Бронь и визит
INSERT INTO Reservations (ClientID, TableID, ReservedFor, Guests, Status)
VALUES (1, 2, NOW()+1, 4, 'planned');

INSERT INTO Visits (ClientID, TableID, EmployeeID, CheckIn, Status)
VALUES (1, 2, 1, NOW(), 'open');

INSERT INTO Orders (VisitID) VALUES (1);
INSERT INTO OrderItems (OrderID, ItemID, Qty, Price) VALUES
 (1, 1, 1, 950.00), (1, 3, 2, 150.00);

INSERT INTO Payments (VisitID, Amount, Method)
VALUES (1, 1250.00, 'card');

INSERT INTO Tickets (ClientID, VisitID, Channel, Subject, Body)
VALUES (1, 1, 'onsite', 'Замечание по сервису', 'Прошу подать горячее быстрее');

INSERT INTO Reviews (ClientID, VisitID, Rating, Comment)
VALUES (1, 1, 5, 'Все супер!');
