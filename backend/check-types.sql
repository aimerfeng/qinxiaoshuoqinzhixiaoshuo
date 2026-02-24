SELECT typname FROM pg_type WHERE typname IN ('LibraryType', 'BranchType', 'DerivativeType', 'UploadFeeType', 'SuggestionType', 'SuggestionStatus', 'BranchTransactionType');
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
