-- MS Access DDL: Ресторан — обслуживание клиентов
-- Замечание: Access поддерживает ограниченно FK через Relationships UI.
-- Для DDL здесь задаём PK, типы и индексы. FK настроишь в Database Tools → Relationships.

-- Справочники
CREATE TABLE Clients (
  ClientID AUTOINCREMENT PRIMARY KEY,
  FullName TEXT(100) NOT NULL,
  Phone TEXT(20),
  Email TEXT(100),
  BirthDate DATETIME,
  Notes MEMO,
  CreatedAt DATETIME DEFAULT NOW()
);

CREATE TABLE Employees (
  EmployeeID AUTOINCREMENT PRIMARY KEY,
  FullName TEXT(100) NOT NULL,
  Role TEXT(50), -- Официант, Хостес, Менеджер
  Phone TEXT(20),
  HireDate DATETIME,
  Active YESNO DEFAULT TRUE
);

CREATE TABLE Tables (
  TableID AUTOINCREMENT PRIMARY KEY,
  TableNumber TEXT(10) NOT NULL,
  Capacity INTEGER,
  Zone TEXT(50) -- Зал, VIP, Терраса
);

CREATE TABLE MenuCategories (
  CategoryID AUTOINCREMENT PRIMARY KEY,
  CategoryName TEXT(50) NOT NULL
);

CREATE TABLE MenuItems (
  ItemID AUTOINCREMENT PRIMARY KEY,
  CategoryID LONG,
  ItemName TEXT(100) NOT NULL,
  Price CURRENCY NOT NULL,
  IsActive YESNO DEFAULT TRUE
);

-- Операционные сущности
CREATE TABLE Reservations (
  ReservationID AUTOINCREMENT PRIMARY KEY,
  ClientID LONG,
  TableID LONG,
  ReservedFor DATETIME NOT NULL,
  Guests INTEGER,
  Status TEXT(20) DEFAULT 'planned', -- planned, arrived, canceled, no-show
  CreatedAt DATETIME DEFAULT NOW(),
  Notes MEMO
);

CREATE TABLE Visits (
  VisitID AUTOINCREMENT PRIMARY KEY,
  ClientID LONG,
  TableID LONG,
  EmployeeID LONG, -- официант
  CheckIn DATETIME DEFAULT NOW(),
  CheckOut DATETIME,
  Status TEXT(20) DEFAULT 'open' -- open, closed, canceled
);

CREATE TABLE Orders (
  OrderID AUTOINCREMENT PRIMARY KEY,
  VisitID LONG,
  CreatedAt DATETIME DEFAULT NOW(),
  Status TEXT(20) DEFAULT 'open' -- open, served, canceled
);

CREATE TABLE OrderItems (
  OrderItemID AUTOINCREMENT PRIMARY KEY,
  OrderID LONG,
  ItemID LONG,
  Qty INTEGER DEFAULT 1,
  Price CURRENCY NOT NULL
);

CREATE TABLE Payments (
  PaymentID AUTOINCREMENT PRIMARY KEY,
  VisitID LONG,
  Amount CURRENCY NOT NULL,
  Method TEXT(20), -- cash, card, online
  PaidAt DATETIME DEFAULT NOW(),
  Ref TEXT(50)
);

CREATE TABLE Tickets (
  TicketID AUTOINCREMENT PRIMARY KEY,
  ClientID LONG,
  VisitID LONG,
  CreatedAt DATETIME DEFAULT NOW(),
  Channel TEXT(20), -- phone, onsite, web
  Subject TEXT(100),
  Body MEMO,
  Status TEXT(20) DEFAULT 'open' -- open, in-progress, closed
);

CREATE TABLE Reviews (
  ReviewID AUTOINCREMENT PRIMARY KEY,
  ClientID LONG,
  VisitID LONG,
  Rating INTEGER, -- 1..5
  Comment MEMO,
  CreatedAt DATETIME DEFAULT NOW()
);

-- Индексы для связей (FK добавишь в Relationships)
CREATE INDEX IX_MenuItems_CategoryID ON MenuItems(CategoryID);
CREATE INDEX IX_Reservations_ClientID ON Reservations(ClientID);
CREATE INDEX IX_Reservations_TableID ON Reservations(TableID);
CREATE INDEX IX_Visits_ClientID ON Visits(ClientID);
CREATE INDEX IX_Visits_TableID ON Visits(TableID);
CREATE INDEX IX_Visits_EmployeeID ON Visits(EmployeeID);
CREATE INDEX IX_Orders_VisitID ON Orders(VisitID);
CREATE INDEX IX_OrderItems_OrderID ON OrderItems(OrderID);
CREATE INDEX IX_OrderItems_ItemID ON OrderItems(ItemID);
CREATE INDEX IX_Payments_VisitID ON Payments(VisitID);
CREATE INDEX IX_Tickets_ClientID ON Tickets(ClientID);
CREATE INDEX IX_Tickets_VisitID ON Tickets(VisitID);
CREATE INDEX IX_Reviews_ClientID ON Reviews(ClientID);
CREATE INDEX IX_Reviews_VisitID ON Reviews(VisitID);
