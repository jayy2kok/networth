package com.networth.service;

import com.networth.model.document.FinancialProfileDocument;
import com.networth.model.document.InvestmentEntry;
import com.networth.repository.FinancialProfileRepository;
import com.zerodhatech.kiteconnect.KiteConnect;
import com.zerodhatech.kiteconnect.kitehttp.exceptions.KiteException;
import com.zerodhatech.models.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ZerodhaServiceTest {
    private final FinancialProfileRepository repository = mock(FinancialProfileRepository.class);
    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final KiteConnect kite = mock(KiteConnect.class);
    private final ZerodhaService service = spy(new ZerodhaService(repository, mongoTemplate));

    private void setup() throws Exception, KiteException {
        ReflectionTestUtils.setField(service, "apiKey", "key");
        ReflectionTestUtils.setField(service, "apiSecret", "secret");
        doReturn(kite).when(service).createClient("key");
        User user = new User();
        user.accessToken = "token";
        when(kite.generateSession("request", "secret")).thenReturn(user);
    }

    @Test
    void replacesOnlyZerodhaAfterAllFetches() throws Exception, KiteException {
        setup();
        Holding holding = new Holding();
        holding.tradingSymbol = "GOLDBEES";
        holding.quantity = 2;
        holding.averagePrice = 10.0;
        holding.lastPrice = 15.0;
        MFHolding fund = new MFHolding();
        fund.fund = "Fund";
        fund.quantity = 3;
        fund.averagePrice = 10;
        fund.lastPrice = 12;
        Margin margin = new Margin();
        margin.available = new Margin.Available();
        margin.available.cash = "42.5";
        when(kite.getHoldings()).thenReturn(List.of(holding));
        when(kite.getMFHoldings()).thenReturn(List.of(fund));
        when(kite.getMargins("equity")).thenReturn(margin);
        InvestmentEntry manual = InvestmentEntry.builder().source("MANUAL").name("keep").build();
        InvestmentEntry old = InvestmentEntry.builder().source("ZERODHA").name("old").build();
        FinancialProfileDocument profile = FinancialProfileDocument.builder().userId("u").investments(new ArrayList<>(List.of(manual, old))).build();
        when(repository.findByUserId("u")).thenReturn(Optional.of(profile));
        var result = service.syncPortfolio("u", "request");
        assertEquals(1, result.equitiesCount());
        assertEquals(1, result.mutualFundsCount());
        assertEquals(42.5, result.cashBalance());
        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).upsert(query.capture(), update.capture(), eq(FinancialProfileDocument.class));
        assertEquals("u", query.getValue().getQueryObject().get("userId"));
        var fields = (org.bson.Document) update.getValue().getUpdateObject().get("$set");
        assertEquals(2, fields.size());
        assertNotNull(fields.get("updatedAt"));
        List<?> investments = (List<?>) fields.get("investments");
        assertEquals(4, investments.size());
        assertSame(manual, investments.getFirst());
        InvestmentEntry equity = (InvestmentEntry) investments.get(1);
        assertEquals("ETF", equity.getInvestmentType());
        assertEquals(List.of("LIQUID"), equity.getCategories());
        assertEquals(List.of("LIQUID"), ((InvestmentEntry) investments.get(2)).getCategories());
        assertEquals(List.of("LIQUID"), ((InvestmentEntry) investments.get(3)).getCategories());
        assertEquals(30.0, equity.getCurrentValue());
        verify(repository, never()).save(any());
    }

    @Test
    void failedFetchDoesNotReadOrModifyProfile() throws Exception, KiteException {
        setup();
        when(kite.getHoldings()).thenReturn(List.of());
        when(kite.getMFHoldings()).thenThrow(new KiteException("sensitive", 403));
        assertThrows(ZerodhaService.ZerodhaException.class, () -> service.syncPortfolio("u", "request"));
        verifyNoInteractions(repository);
        verifyNoInteractions(mongoTemplate);
    }

    @Test
    void malformedMarginDoesNotModifyProfile() throws Exception, KiteException {
        setup();
        when(kite.getHoldings()).thenReturn(List.of());
        when(kite.getMFHoldings()).thenReturn(List.of());
        Margin margin = new Margin();
        margin.net = "invalid";
        when(kite.getMargins("equity")).thenReturn(margin);
        assertThrows(ZerodhaService.ZerodhaException.class, () -> service.syncPortfolio("u", "request"));
        verifyNoInteractions(repository);
        verifyNoInteractions(mongoTemplate);
    }

    @Test
    void missingConfigurationFailsWithoutAccessingRepository() {
        ReflectionTestUtils.setField(service, "apiKey", "");
        assertEquals(503, assertThrows(ZerodhaService.ZerodhaException.class, service::getLoginUrl).getStatus());
        verifyNoInteractions(repository);
    }
}