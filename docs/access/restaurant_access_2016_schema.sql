CREATE TABLE [Clients] (
  [ClientID] AUTOINCREMENT PRIMARY KEY,
  [FullName] TEXT(100) NOT NULL,
  [Phone] TEXT(20),
  [Email] TEXT(100),
  [BirthDate] DATETIME,
  [Notes] LONGTEXT
);

CREATE TABLE [Employees] (
  [EmployeeID] AUTOINCREMENT PRIMARY KEY,
  [FullName] TEXT(100) NOT NULL,
  [Role] TEXT(50),
  [Phone] TEXT(20),
  [HireDate] DATETIME,
  [Active] YESNO
);

CREATE TABLE [DiningTables] (
  [TableID] AUTOINCREMENT PRIMARY KEY,
  [TableNumber] TEXT(10) NOT NULL,
  [Capacity] LONG,
  [Zone] TEXT(50)
);

CREATE TABLE [MenuCategories] (
  [CategoryID] AUTOINCREMENT PRIMARY KEY,
  [CategoryName] TEXT(50) NOT NULL
);

CREATE TABLE [MenuItems] (
  [ItemID] AUTOINCREMENT PRIMARY KEY,
  [CategoryID] LONG,
  [ItemName] TEXT(100) NOT NULL,
  [Price] CURRENCY NOT NULL,
  [IsActive] YESNO
);

CREATE TABLE [Reservations] (
  [ReservationID] AUTOINCREMENT PRIMARY KEY,
  [ClientID] LONG,
  [TableID] LONG,
  [ReservedFor] DATETIME NOT NULL,
  [Guests] LONG,
  [Status] TEXT(20),
  [Notes] LONGTEXT
);

CREATE TABLE [Visits] (
  [VisitID] AUTOINCREMENT PRIMARY KEY,
  [ClientID] LONG,
  [TableID] LONG,
  [EmployeeID] LONG,
  [CheckIn] DATETIME,
  [CheckOut] DATETIME,
  [Status] TEXT(20)
);

CREATE TABLE [Orders] (
  [OrderID] AUTOINCREMENT PRIMARY KEY,
  [VisitID] LONG,
  [CreatedAt] DATETIME,
  [Status] TEXT(20)
);

CREATE TABLE [OrderItems] (
  [OrderItemID] AUTOINCREMENT PRIMARY KEY,
  [OrderID] LONG,
  [ItemID] LONG,
  [Qty] LONG,
  [Price] CURRENCY NOT NULL
);

CREATE TABLE [Payments] (
  [PaymentID] AUTOINCREMENT PRIMARY KEY,
  [VisitID] LONG,
  [Amount] CURRENCY NOT NULL,
  [Method] TEXT(20),
  [PaidAt] DATETIME,
  [Ref] TEXT(50)
);

CREATE TABLE [Tickets] (
  [TicketID] AUTOINCREMENT PRIMARY KEY,
  [ClientID] LONG,
  [VisitID] LONG,
  [CreatedAt] DATETIME,
  [Channel] TEXT(20),
  [Subject] TEXT(100),
  [Body] LONGTEXT,
  [Status] TEXT(20)
);

CREATE TABLE [Reviews] (
  [ReviewID] AUTOINCREMENT PRIMARY KEY,
  [ClientID] LONG,
  [VisitID] LONG,
  [Rating] LONG,
  [Comment] LONGTEXT,
  [CreatedAt] DATETIME
);

CREATE INDEX [IX_MenuItems_CategoryID] ON [MenuItems]([CategoryID]);
CREATE INDEX [IX_Reservations_ClientID] ON [Reservations]([ClientID]);
CREATE INDEX [IX_Reservations_TableID] ON [Reservations]([TableID]);
CREATE INDEX [IX_Visits_ClientID] ON [Visits]([ClientID]);
CREATE INDEX [IX_Visits_TableID] ON [Visits]([TableID]);
CREATE INDEX [IX_Visits_EmployeeID] ON [Visits]([EmployeeID]);
CREATE INDEX [IX_Orders_VisitID] ON [Orders]([VisitID]);
CREATE INDEX [IX_OrderItems_OrderID] ON [OrderItems]([OrderID]);
CREATE INDEX [IX_OrderItems_ItemID] ON [OrderItems]([ItemID]);
CREATE INDEX [IX_Payments_VisitID] ON [Payments]([VisitID]);
CREATE INDEX [IX_Tickets_ClientID] ON [Tickets]([ClientID]);
CREATE INDEX [IX_Tickets_VisitID] ON [Tickets]([VisitID]);
CREATE INDEX [IX_Reviews_ClientID] ON [Reviews]([ClientID]);
CREATE INDEX [IX_Reviews_VisitID] ON [Reviews]([VisitID]);

ALTER TABLE [MenuItems]
  ADD CONSTRAINT [FK_MenuItems_Categories]
  FOREIGN KEY ([CategoryID]) REFERENCES [MenuCategories]([CategoryID]);

ALTER TABLE [Reservations]
  ADD CONSTRAINT [FK_Reservations_Clients]
  FOREIGN KEY ([ClientID]) REFERENCES [Clients]([ClientID]);

ALTER TABLE [Reservations]
  ADD CONSTRAINT [FK_Reservations_Tables]
  FOREIGN KEY ([TableID]) REFERENCES [DiningTables]([TableID]);

ALTER TABLE [Visits]
  ADD CONSTRAINT [FK_Visits_Clients]
  FOREIGN KEY ([ClientID]) REFERENCES [Clients]([ClientID]);

ALTER TABLE [Visits]
  ADD CONSTRAINT [FK_Visits_Tables]
  FOREIGN KEY ([TableID]) REFERENCES [DiningTables]([TableID]);

ALTER TABLE [Visits]
  ADD CONSTRAINT [FK_Visits_Employees]
  FOREIGN KEY ([EmployeeID]) REFERENCES [Employees]([EmployeeID]);

ALTER TABLE [Orders]
  ADD CONSTRAINT [FK_Orders_Visits]
  FOREIGN KEY ([VisitID]) REFERENCES [Visits]([VisitID]);

ALTER TABLE [OrderItems]
  ADD CONSTRAINT [FK_OrderItems_Orders]
  FOREIGN KEY ([OrderID]) REFERENCES [Orders]([OrderID]);

ALTER TABLE [OrderItems]
  ADD CONSTRAINT [FK_OrderItems_Items]
  FOREIGN KEY ([ItemID]) REFERENCES [MenuItems]([ItemID]);

ALTER TABLE [Payments]
  ADD CONSTRAINT [FK_Payments_Visits]
  FOREIGN KEY ([VisitID]) REFERENCES [Visits]([VisitID]);

ALTER TABLE [Tickets]
  ADD CONSTRAINT [FK_Tickets_Clients]
  FOREIGN KEY ([ClientID]) REFERENCES [Clients]([ClientID]);

ALTER TABLE [Tickets]
  ADD CONSTRAINT [FK_Tickets_Visits]
  FOREIGN KEY ([VisitID]) REFERENCES [Visits]([VisitID]);

ALTER TABLE [Reviews]
  ADD CONSTRAINT [FK_Reviews_Clients]
  FOREIGN KEY ([ClientID]) REFERENCES [Clients]([ClientID]);

ALTER TABLE [Reviews]
  ADD CONSTRAINT [FK_Reviews_Visits]
  FOREIGN KEY ([VisitID]) REFERENCES [Visits]([VisitID]);
